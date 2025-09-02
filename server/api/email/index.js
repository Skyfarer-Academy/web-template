/**
 * This file exports endpoints to be used for receiving and sending emails.
 *
 * Templates are stored in ../../templates, and may be copied from
 * Sharetribe's builtin email templates, with the following changes:
 *
 * - remove the set-translations and set-locale tags
 * - url-encode param should be quoted, e.g. {{url-encode "transaction.id"}}
 *
 */

const fs = require('fs');
const formidable = require('formidable');
const handlebars = require('handlebars');
const path = require('path');
const { v4: uuid } = require('uuid');

const { asyncHandler } = require('../../api-util/asyncHandler');
const { getISdk, getSdk } = require('../../api-util/sdk');

const isdk = getISdk();

const mail = require('@sendgrid/mail');
mail.setApiKey(process.env.SENDGRID_API_KEY);
const { t } = require('../../api-util/emailHelpers');

module.exports = {
  incoming: asyncHandler(async (req, res) => {
    const form = new formidable.IncomingForm();

    // High-level request context for debugging
    try {
      console.log('[email.incoming] Request received', {
        method: req.method,
        url: req.url,
        headers: {
          'content-type': req.headers['content-type'],
          'user-agent': req.headers['user-agent'],
          'content-length': req.headers['content-length'],
        },
        query: req.query,
      });
    } catch (e) {
      // avoid throwing during logging
    }

    form.parse(req, async (err, fields, files) => {
      // Log parse outcome first
      if (err) {
        console.error('[email.incoming] formidable.parse error', {
          message: err.message,
          stack: err.stack,
        });
        return res.status(400).end();
      }

      try {
        console.log('[email.incoming] Parsed multipart payload', {
          fieldKeys: Object.keys(fields || {}),
          fileKeys: Object.keys(files || {}),
          sampleFrom: fields?.from,
          sampleTextType: typeof fields?.text,
          sampleTextIsArray: Array.isArray(fields?.text),
          sampleTextLength: Array.isArray(fields?.text) ? fields.text.length : undefined,
        });
      } catch (e) {
        // swallow logging errors
      }

      // Safely extract values that might be arrays depending on Formidable version
      const from = Array.isArray(fields?.from) ? fields.from[0] : fields?.from;
      const text = Array.isArray(fields?.text) ? fields.text[0] : fields?.text;

      if (!from || !text) {
        console.warn('[email.incoming] Missing required fields', {
          hasFrom: !!from,
          hasText: !!text,
          fieldsPreview: (() => {
            try {
              const json = JSON.stringify(fields);
              return json ? json.slice(0, 1000) : undefined;
            } catch (_) {
              return undefined;
            }
          })(),
        });
        return res.status(400).json({ error: 'Missing required fields: from or text' });
      }

      let id = text.match(/sale\/(\w{8}-\w{4}-\w{4}-\w{4}-\w{12})/)?.[1]; // Match sale/UUID
      if (!id) id = text.match(/order\/(\w{8}-\w{4}-\w{4}-\w{4}-\w{12})/)?.[1]; // Match order/UUID

      try {
        console.log('[email.incoming] Extracted transaction id', {
          hasId: !!id,
          id,
        });
      } catch (e) {}

      if (!id) {
        const template = handlebars.compile(fs.readFileSync(path.join(__dirname, '../../templates/not-sent.html'), 'utf8').toString());
        const html = template({
          message: {
            content: text,
            marketplace: {
              name: process.env.REACT_APP_MARKETPLACE_NAME,
              url: process.env.REACT_APP_MARKETPLACE_ROOT_URL
            }
          },
        });

        try {
          const result = await mail.send({
            to: from,
            from: process.env.SENDGRID_FROM_EMAIL,
            replyTo: process.env.SENDGRID_REPLY_TO_EMAIL,
            subject: 'Your message has not been sent!',
            html
          });
          console.log(`[email.incoming] Not-sent notification dispatched`, {
            to: from,
            statusCode: result?.[0]?.statusCode,
          });
        } catch (e) {
          console.error('[email.incoming] Failed to send not-sent notification', {
            to: from,
            message: e.message,
          });
        }

        return res.status(200).end();
      }

      const { data: transactionData, errors: transactionErrors, status: transactionStatus } = await isdk.transactions.show({ id, include: 'customer,provider' });
      if (!transactionData || transactionErrors || transactionStatus !== 200) {
        console.error('[email.incoming] Failed to fetch transaction', {
          id,
          transactionStatus,
          transactionErrors,
        });
        return res.status(transactionStatus ?? 500).end();
      }
      const { data: transaction } = transactionData;
      const { customer, provider } = transaction.relationships;

      const { data: customerData, errors: customerErrors, status: customerStatus } = await isdk.users.show({ id: customer.data.id });
      const { data: providerData, errors: providerErrors, status: providerStatus } = await isdk.users.show({ id: provider.data.id });
      if (!customerData || customerErrors || customerStatus !== 200 || !providerData || providerErrors || providerStatus !== 200) {
        console.error('[email.incoming] Failed to fetch users', {
          id,
          customerStatus,
          providerStatus,
          customerErrors,
          providerErrors,
        });
        return res.status(customerStatus ?? providerStatus ?? 500).end();
      }

      const { email: customerEmail } = customerData.data.attributes;
      const { email: providerEmail } = providerData.data.attributes;

      const cleanFrom = from.includes('<') ? from.split('<')[1].split('>')[0] : from;
      if (![customerEmail, providerEmail].includes(cleanFrom)) {
        console.warn('[email.incoming] Sender not part of transaction', {
          cleanFrom,
          customerEmail,
          providerEmail,
          id,
        });
        return res.status(403).end();
      }

      const isFromCustomer = cleanFrom === customerEmail;
      const senderData = isFromCustomer ? customerData.data : providerData.data;

      const sender = {
        id: senderData.id.uuid,
        type: senderData.type,
        attributes: {
          ...senderData.attributes,
          createdAt: new Date(senderData.attributes.createdAt).toISOString(),
        },
      };

      // Our best effort to clean up the email content
      const content = text
        .replace(/\n>.*/g, '') // Remove quoted reply
        .replace(/-+\s.+\s-+/g, '') // Remove standard quote header
        .replace(/On\s.*\swrote:/g, '') // Remove standard quote date
        .replace(/\+.+@.+>$/, '') // Remove email footer
        .trim();

      const message = {
        id: uuid(),
        type: 'message',
        sender,
        attributes: { content, createdAt: new Date().toISOString() },
      };

      // Ideally, I would like to use isdk.messages.send, but the
      // integration API doesn't support it, and I don't think we
      // can fake-authenticate as the customer or provider on the
      // backend, or at least I haven't figured it out yet, so we
      // can just store the messages in the transaction metadata
      try {
        await isdk.transactions.updateMetadata({
          id,
          metadata: {
            emails: [...(transaction.attributes.metadata?.emails || []), message],
          },
        });
        console.log('[email.incoming] Stored message in transaction metadata', { id });
      } catch (e) {
        console.error('[email.incoming] Failed to update transaction metadata', {
          id,
          message: e.message,
        });
        return res.status(500).end();
      }

      const template = handlebars.compile(fs.readFileSync(path.join(__dirname, '../../templates/new-message.html'), 'utf8').toString());
      const html = template({
        message: {
          content: message.attributes.content,
          sender: {
            'display-name': senderData.attributes.profile.displayName
          },
          marketplace: {
            name: process.env.REACT_APP_MARKETPLACE_NAME,
            url: process.env.REACT_APP_MARKETPLACE_ROOT_URL
          },
          transaction: { id },
          'recipient-role': isFromCustomer ? 'provider' : 'customer'
        }
      });

      let result;
      try {
        result = await mail.send({
          to: isFromCustomer ? providerEmail : customerEmail,
          from: `${senderData.attributes.profile.displayName} ${t('General.Via', 'via')} ${process.env.REACT_APP_MARKETPLACE_NAME} <${process.env.SENDGRID_FROM_EMAIL}>`,
          replyTo: process.env.SENDGRID_REPLY_TO_EMAIL,
          subject: t('NewMessage.Subject', `{{senderName}} has sent you a new message`, { hash: { senderName: senderData.attributes.profile.displayName } }),
          html
        });
      } catch (e) {
        console.error('[email.incoming] Failed to send new-message email', {
          to: isFromCustomer ? providerEmail : customerEmail,
          message: e.message,
        });
        return res.status(500).end();
      }

      console.log(`(${result[0]?.statusCode || 500}) Processed incoming email from ${from} to ${isFromCustomer ? providerEmail : customerEmail}`);
      return res.status(200).end();
    });
  }),
};

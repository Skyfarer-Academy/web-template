import React, { useState } from "react";
import { ChevronDown, ChevronUp, ImportIcon } from "lucide-react";
import { FormattedMessage } from "react-intl";
import { Heading } from '../../components';

import css from "./ListingPage.module.css"; 

const faqList = [
  { question: "How long should I book for a lesson?", 
    answer: (
        <>
            Most lessons are scheduled for around one hour of flight time, but they often take closer to two hours. That’s because your flight instructor will spend time before and after each flight briefing you on what to expect, reviewing your performance, and setting goals for the next lesson.
            <br /><br />
            For specialized instruction, such as a flight review or an endorsement the session may take longer. You can always discuss the estimated duration with your instructor in advance.
            <br /><br />
            If your lesson runs longer or shorter than planned, instructors on Skyfarer can make a{" "}
            <a href="https://skyfareracademy.com/p/post-lesson-adjustment-for-calendar-bookings" target="_blank" rel="noopener noreferrer">
            Post-Lesson Adjustment
            </a>{" "}
            through the platform to reflect the actual time spent.
        </>
    )
  },
  { question: "What if my first lesson with an instructor isn’t a good fit?", 
    answer: (
        <>
            No worries! Our{" "}
            <a href="https://skyfareracademy.com/p/fly-with-confidence-money-back-guarantee" target="_blank" rel="noopener noreferrer">
            fly with confidence
            </a>{" "}
            has your back. If your first lesson doesn’t feel like the right fit, we’ll help you find another instructor who better matches your training goals and give you an extra session on us. You'll receive a full refund — up to 2 hours of instruction, with a maximum value of $200.
        </>
    )
  },
  { question: "How should I compare instructor pricing and value?", 
    answer: (
        <>
            When choosing a flight instructor (CFI), it’s easy to focus on the hourly rate—but that’s often only part of the picture. Flight training isn’t just about cost; it’s about value, progress, and quality of instruction. A “cheaper” rate may sound appealing at first, but if it takes twice as long to reach your goals, you could end up spending more in the long run.
            <br /><br />
            It’s also important to understand what’s <em>included</em> in that rate. It may also include aircraft access and fuel. A well-qualified instructor with a thoughtful training approach can make your learning experience safer, more efficient, and far more rewarding—especially when you’re flying with friends or family down the line.
        </>
    )
  },
  { question: "How long does learning to fly take?", 
    answer: (
        <>
            It depends on your pace and schedule! Under FAA Part 61, you’ll need a minimum of 40 hours of flight training to earn your Private Pilot Certificate — at least 20 hours with an instructor and 20 hours of solo practice. However, most students complete their Private Pilot training in 60 to 80 hours, depending on lesson frequency, study habits, the type of training aircraft used, weather, and the airport.
            <br /><br />
            You should discuss this with your flight instructor to set up a training plan and keep your progress steady and efficient.
        </>
    )
  },
  { question: "How do I choose a flight instructor?", 
    answer: (
        <>
            Each listing shows an instructor’s background, certifications, specialties, and student reviews. Don’t hesitate to ask plenty of questions — finding the right fit matters. We also have a{" "} 
            <a href="https://skyfareracademy.com/p/how-to-choose-flight-instructor-for-pilot-training" target="_blank" rel="noopener noreferrer" style={{ textDecoration: "underline" }}>
            blog article
            </a>{" "}
            that provides specific tips and expert advice for students and pilots.
        </>
    )
  },
  { question: "Can I carry passengers?",
    answer: (
        <>
            Student pilots are not permitted to carry passengers during solo flights. However, friends or family members may join you on dual lessons (when your instructor is in the plane), if your instructor approves.
            <br /><br />
            Recreational and sport pilots may carry only one passenger at a time. Private pilots and above may carry as many passengers as the aircraft is legally approved to seat, as long as the flight remains within all performance and weight-and-balance limitations.
        </>
    )
  },
  { question: "What kinds of aircraft can I fly?",
    answer: (
        <>
            If you’re training for a Private, Sport/Recreational, Instrument, or Multi-Engine Certificate, you’ll most likely learn in a two- or four-seat airplane with a single engine and fixed landing gear. Most training aircraft carry two to four hours of fuel and cruise at around 100 mph.
            <br /><br />
            If you don’t have access to an airplane, be sure to choose an instructor who does. You may see available aircraft types on each instructor’s listing page and use the filters on the search results page to find instructors with the right equipment for your training needs.
        </>
    )
  },
  { question: "How often should I plan to fly?",
    answer: (
        <>
            For Private Pilot training, we recommend scheduling <strong>2–5 training sessions per week</strong>. This pace helps you stay on track to complete your program efficiently, even with occasional cancellations due to weather or maintenance.
            <br /><br />
            If you’d like to train more frequently, many instructors offer <strong>off-peak availability</strong> in the early morning or evening—great opportunities to build additional flight time and maintain consistent progress.
        </>
    )
  },
  { question: "Is it okay if I can’t train full-time?",
    answer: (
        <>
            Yes. Just let your instructor know your availability, and they can help create a schedule for you. One of the most common pilot training challenges is irregular or infrequent lessons. While full-immersion programs can accelerate progress, what matters most is consistency. Regular, steady training leads to better retention and smoother advancement—and your instructor will work with you to make that happen.
        </>
    )
  },
  { question: "If I trained under another instructor or school, do I have to start over?",
    answer: (
        <>
            Not at all! All of your previous flight hours and experience still count. When you continue training, your flight instructor will review your logbook and current proficiency to pick up right where you left off. What matters most is your proficiency and flying to FAA standards.
        </>
    )
  },
  { question: "How do I book and what does it cost?",
    answer: (
        <>
            Booking flying lessons is quick and easy: Select your preferred time and click <strong>"Request to book"</strong> to instantly send a booking request, you won’t be charged until the instructor accepts the booking request.
            <br /><br />
            Training costs: Instructors on Skyfarer offer transparent, competitive pricing tailored to different budgets and needs.
            <br /><br />
            Payments: We accept credit/debit cards.
        </>
    )
  },
  { question: "What happens after booking?",
    answer: (
        <>
            Once your booking is accepted, you’ll receive an email confirmation and can message your instructor directly through Skyfarer to finalize details. After the session, you can leave feedback and book your next lesson anytime.
            <br /><br />
            By booking on Skyfarer, your training is backed by our{" "}
            <a href="https://skyfareracademy.com/p/fly-with-confidence-money-back-guarantee" target="_blank" rel="noopener noreferrer" style={{ textDecoration: "underline" }}>
            100% fly with confidence guarantee
            </a>{" "}
            ,secure payment protection, and support from the Skyfarer team — we’re here to help if you ever need assistance. Booking on Skyfarer also keeps a record of all messages between you and your instructor in your Skyfarer inbox. We actively review and take action in response to any conduct that is inappropriate, unsafe, or dishonest.
        </>
    )
  },
];

const SectionFAQMaybe = ({categoryLevel1}) => {
  const [openIndex, setOpenIndex] = useState(null);

  const toggleFAQ = (index) => setOpenIndex(openIndex === index ? null : index);

  // Only show FAQ for these listing categories
  const validCategories = ["Instructors-Flight-Schools-Clubs"];

  // console.log("FAQ categoryLevel1 received:", categoryLevel1);

  if (!categoryLevel1 || !validCategories.includes(categoryLevel1)) {
    return null; // Don't render FAQ if not in valid category
  }

  return (
    <section id="faq" className={css.faqSection}>
      <Heading as="h2" rootClassName={css.sectionHeadingWithExtraMargin}>
        <FormattedMessage id="ListingPage.aboutfaq" />
      </Heading>

      <div className={css.faqContainer}>
        {faqList.map((item, index) => {
          const isOpen = openIndex === index;
          return (
            <div key={index} className={css.faqItem}>
              <button
                className={css.faqQuestion}
                onClick={() => toggleFAQ(index)}
              >
                <span className={isOpen ? css.faqQuestionOpen : ""}>
                  {item.question}
                </span>
                {isOpen ? (
                  <ChevronUp className={css.faqIcon} strokeWidth={2} />
                ) : (
                  <ChevronDown className={css.faqIcon} strokeWidth={2} />
                )}
              </button>
              {isOpen && (
                <div className={css.faqAnswer}>
                  {item.answer}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default SectionFAQMaybe;

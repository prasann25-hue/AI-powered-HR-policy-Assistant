require('dotenv').config();
const { supabaseAdmin } = require('./src/config/supabase');
const { generateEmbedding, chunkText } = require('./src/services/geminiService');

const policiesToIngest = [
  {
    title: 'Welcome & Company Overview (HR-GEN-001)',
    category: 'General',
    access_level: 'global',
    content: `TechCo, Inc. Employee Handbook & HR Policy Manual (Version 1.0, Effective January 1, 2025).

CHAPTER 01: Welcome & Company Overview
Policy ID: HR-GEN-001
Owner: CEO / Founder

1.1 A Message from Leadership
Welcome to TechCo, Inc.! We are thrilled that you have chosen to be part of our journey. This handbook is your definitive guide to understanding who we are, how we operate, and the standards we hold ourselves to. We have crafted these policies not as constraints but as a shared contract — one that enables everyone to do their best work in a safe, inclusive, and high-performance environment. Please read it carefully and keep it as a reference throughout your time with us.

Note: This handbook supersedes all prior oral or written representations regarding employment terms and conditions. It is not an employment contract. TechCo reserves the right to revise, supplement, or rescind any policy with reasonable notice to employees.

1.2 Our Mission, Vision & Core Values
Mission: To build technology that makes work simpler, smarter, and more human — for every team on the planet.
Vision: A world where great software empowers people to focus on what truly matters.

Core Values:
• Ownership: We act like founders. We take responsibility for outcomes, not just tasks.
• Transparency: We communicate openly, share context freely, and default to trust.
• Customer Obsession: Every decision traces back to the impact on our customers.
• Continuous Growth: We learn fast, iterate fast, and never stop improving.
• Inclusion & Belonging: Diverse perspectives make us stronger. Everyone deserves to thrive here.

1.3 Scope & Applicability
This handbook applies to all full-time employees, part-time employees, and interns at TechCo, Inc. Consultants and contractors are governed by their respective service agreements but are expected to adhere to the Code of Conduct (Chapter 06) while on company premises or representing TechCo.

1.4 Policy Amendments
TechCo reserves the right to amend, modify, or withdraw any policy in this handbook at any time. Changes will be communicated via email and updated on the company intranet. Continued employment after notification constitutes acceptance of the revised terms.`
  },
  {
    title: 'Recruitment & Onboarding Policy (HR-REC-001)',
    category: 'Recruitment',
    access_level: 'global',
    content: `CHAPTER 02: Recruitment & Onboarding
Policy ID: HR-REC-001
Owner: Head of People

2.1 Equal Opportunity Employment
TechCo is an equal opportunity employer. We do not discriminate on the basis of race, colour, religion, gender, gender identity or expression, sexual orientation, national origin, age, disability, marital status, veteran status, or any other protected characteristic under applicable law. This commitment applies to all employment decisions including hiring, compensation, promotion, and termination.

2.2 Hiring Process
Our hiring process is structured to be fair, efficient, and respectful of every candidate's time:
Stage 1: Job Requisition - Hiring manager raises a JR in the ATS with role details and budget approval (T+0, Hiring Manager).
Stage 2: Sourcing & Screening - Talent team sources candidates; initial resume screen against JD (T+3 days, Recruiter).
Stage 3: Phone Screen - 30-min culture & motivation conversation (T+5 days, Recruiter / HR).
Stage 4: Technical / Skills Round - Role-specific assessment or take-home project (T+8 days, Technical Interviewer).
Stage 5: Panel Interview - Structured interviews covering skills, values, and case studies (T+11 days, Hiring Panel).
Stage 6: Leadership Round - Conversation with CXO/Director for senior roles L5+ (T+13 days, Leadership).
Stage 7: Offer & Negotiation - Verbal offer followed by written offer letter within 24 hours (T+15 days, HR + Hiring Mgr).

2.3 Background Verification
All offers are contingent upon successful completion of background verification conducted by a third-party agency. The verification includes employment history (last 7 years), educational credentials, criminal record check (where legally permitted), and identity verification. Candidates must provide accurate information; any discrepancy may result in offer withdrawal or termination.

2.4 Offer Letters & Employment Contracts
Every new hire receives:
• A written offer letter detailing role, compensation, start date, and reporting structure.
• An Employment Agreement covering intellectual property, confidentiality, and non-solicitation clauses.
• An NDA (Non-Disclosure Agreement) where applicable.
• A copy of this Employee Handbook (acknowledgement required within 5 days of joining).

2.5 Onboarding & Orientation Program
We invest heavily in onboarding because Day 1 sets the tone. Our structured 90-day onboarding journey includes:
• Week 1 — Welcome & Setup: IT setup, systems access, team introductions, culture deep-dive, and 1:1 with manager on 30/60/90-day goals.
• Month 1 — Learn: Shadowing sessions, product walkthroughs, process documentation review, and first deliverables defined.
• Month 2 — Contribute: Independent ownership of tasks, participation in team rituals, and mid-point check-in with HR.
• Month 3 — Own: Full role ownership, completion of onboarding checklist, and end-of-probation review.
★ Every new joiner is assigned a Buddy — a peer outside their immediate team — for the first 90 days.

2.6 Probation Period
All new employees serve a probation period of 90 calendar days (3 months). During this period, either party may terminate employment with 7 days' written notice. At the end of probation, the manager completes a formal assessment. Successful completion results in confirmation of employment. If performance is below expectations, probation may be extended by 30 days with a documented improvement plan.`
  },
  {
    title: 'Leave & Attendance Policy (HR-LEA-001)',
    category: 'Leave & Attendance',
    access_level: 'global',
    content: `CHAPTER 03: Leave & Attendance
Policy ID: HR-LEA-001
Owner: Head of People

3.1 Working Hours & Flexible Work
TechCo operates on a flexible-first model. Standard business hours are 10:00 AM – 7:00 PM local time, Monday through Friday, with a core collaboration window of 11:00 AM – 4:00 PM during which all team members are expected to be available. Outside the core window, employees have flexibility in structuring their day. Total expected hours are 40 hours per week.

3.2 Leave Entitlements
TechCo provides the following leave categories to all confirmed employees:
• Earned / Privilege Leave (PL): 18 days per year. Carry-forward: Up to 30 days. Encashment: Yes (on exit). Notice: 3 working days prior.
• Sick Leave (SL): 10 days per year. Carry-forward: Not allowed. Encashment: No. Notice: Inform manager on Day 1 by 10:00 AM.
• Casual Leave (CL): 6 days per year. Carry-forward: Not allowed. Encashment: No. Notice: 1 working day prior.
• Maternity Leave: 26 weeks (first 2 births). Encashment: No. Notice: 8 weeks before due date.
• Paternity Leave: 10 working days. Encashment: No. Notice: 2 weeks' notice.
• Bereavement Leave: 5 days (immediate family). Encashment: No. Notice: As soon as practicable.
• Marriage Leave: 3 days (once in service). Encashment: No. Notice: 2 weeks' notice.
• Menstrual Wellness Leave: 1 day/month (12/year). Carry-forward: Not allowed. Encashment: No. Notice: Day of absence.
• Compensatory Off: As earned for project overtime. Must use within 30 days. Notice: 1 working day prior.
• Unpaid Leave: With manager & HR approval. Notice: 1 week prior.

3.3 Leave Application Process
• Apply on HRMS portal (or manager email if portal unavailable) with reason and date range.
• Sick leave must be notified by 10:00 AM on Day 1.
• Leaves exceeding 3 consecutive days require a medical certificate.
• Emergency or retroactive leave requests must be documented within 24 hours.

3.4 Holidays
TechCo provides 12 public holidays per calendar year. Additionally, employees may choose 2 Flexible/Optional Holidays from a pre-approved list. Employees required to work on a public holiday get compensatory leave on a 1:1 basis.

3.5 Attendance & Punctuality
Absence without information (AWOL) for 3 or more consecutive days without manager notification will be treated as abandonment of employment. Chronic tardiness or habitual absenteeism will be addressed through performance management.

3.6 Remote & Hybrid Work Policy
TechCo supports hybrid work. Employees may work remotely up to 3 days per week, subject to role requirements and manager approval. Remote employees must:
• Maintain a professional, distraction-free workspace during core hours.
• Be reachable via Slack/Zoom within 15 minutes during core hours.
• Ensure a reliable internet connection of at least 25 Mbps.
• Attend in-office on designated team days (typically Tuesday and Thursday).
• Notify manager in advance if changing remote/in-office days.
Full-remote arrangements require prior approval from Department Head and HR and are reviewed quarterly.`
  },
  {
    title: 'Compensation & Benefits Policy (HR-COM-001)',
    category: 'Compensation',
    access_level: 'global',
    content: `CHAPTER 04: Compensation & Benefits
Policy ID: HR-COM-001
Owner: CFO / Head of People

4.1 Salary Structure & Pay Cycle
All employee salaries are structured as Cost to Company (CTC) including fixed pay, variable pay, and benefits. Salaries are processed on the last working day of each calendar month via direct bank transfer. Pay slips are available on the HRMS portal by the 3rd of the following month. TechCo benchmarks compensation against industry surveys (Radford/Mercer) and targets the 75th percentile for each role band.

Salary Bands & Variable Pay:
• L1 (Associate / Junior Engineer / Analyst): 0% variable
• L2 (Mid-Level Engineer / Analyst II): 5% variable
• L3 (Senior Engineer / Team Lead): 10% variable
• L4 (Staff Engineer / Specialist / Manager): 15% variable
• L5 (Principal Engineer / Senior Manager): 20% variable
• L6 (Distinguished Engineer / Director / VP): 25–40% variable

4.2 Performance Bonuses & Incentives
• Annual Performance Bonus: Up to the variable percentage of fixed salary, paid in April, linked to individual and company OKR achievement.
• Spot Bonus: Discretionary cash awards (up to INR 25,000 / USD 300) for exceptional contributions.
• Referral Bonus: Paid upon 90-day retention of a referred hire (INR 10,000 – INR 50,000).
• Sales Incentive Plan (SIP): Separate commission structure for Sales roles.

4.3 Health & Wellness Benefits
• Group Medical Insurance: Coverage of INR 5,00,000 per employee per annum; spouse, children, and parents (up to 2) included at company cost.
• Group Personal Accident Insurance: Coverage of 3x CTC up to INR 30,00,000.
• Group Term Life Insurance: 5x annual fixed salary.
• Mental Health Support: Free access to a licensed therapy platform (6 sessions/year) and Employee Assistance Programme (EAP).
• Wellness Allowance: INR 5,000 / USD 60 per quarter for gym memberships, fitness apps, or wellness activities.
• Ergonomics Budget: INR 10,000 one-time allowance for remote work setup (chair, keyboard, monitor stand).

4.4 Equity & ESOPs
Eligible employees (L3 and above) may receive Employee Stock Option Plan (ESOP) grants. Vesting follows a standard 4-year schedule with a 1-year cliff (25% at month 12, then monthly vesting for remaining 36 months).

4.5 Learning & Development Budget
• Annual L&D Budget: INR 30,000 / USD 360 per year for courses, certifications, books, or conferences.
• Internal Learning: Lunch-and-learn sessions, Tech Talks, and cross-functional rotations.
• Unused L&D budget does not carry forward and cannot be encashed.

4.6 Other Perks & Benefits
• Internet Reimbursement: INR 1,000 / USD 12 per month.
• Mobile Allowance: INR 500 / USD 6 per month for work-related usage.
• Free Snacks & Beverages at office.
• Company-wide team offsites twice a year.
• Pet-friendly office policy.
• Paid volunteering day: 1 day per year.`
  },
  {
    title: 'Performance Management Policy (HR-PER-001)',
    category: 'Performance',
    access_level: 'global',
    content: `CHAPTER 05: Performance Management
Policy ID: HR-PER-001
Owner: Head of People / Dept Heads

5.1 Performance Review Cycle
TechCo uses a bi-annual performance review cycle (January and July) supported by continuous feedback throughout the year. The review process includes self-assessment, manager assessment, and calibration among leaders. Ratings follow a 5-point scale:
• Rating 5 (Exceptional): Significantly exceeded all goals; role model impact. Bonus Multiplier: 120–140%.
• Rating 4 (Exceeds Expectations): Exceeded most goals with strong performance. Bonus Multiplier: 100–119%.
• Rating 3 (Meets Expectations): Consistently delivered against all set goals. Bonus Multiplier: 80–99%.
• Rating 2 (Partially Meets): Met some goals; improvement areas identified. Bonus Multiplier: 0–79%.
• Rating 1 (Does Not Meet): Significant performance gaps; PIP may be initiated. Bonus Multiplier: 0%.

5.2 Goal Setting & OKRs
Every employee sets Objectives and Key Results (OKRs) at the start of each half-year following the SMART framework (Specific, Measurable, Achievable, Relevant, Time-bound). OKRs are documented in HRMS and reviewed monthly in 1:1s.

5.3 360-Degree Feedback
For L3 and above, TechCo conducts 360-degree feedback twice a year. Each employee selects 3–5 peers and cross-functional collaborators to provide structured, anonymised input.

5.4 Performance Improvement Plans (PIPs)
A PIP is a structured support mechanism. When an employee receives a rating of 2 (Partially Meets) or lower, or sustained underperformance:
• Manager documents performance gaps and discusses with HR.
• Formal PIP document with clear goals and 60-day improvement window.
• Weekly check-ins conducted.
• At end of PIP: 3 outcomes - successful completion, extension (with justification), or termination (with notice & severance).
Employees have the right to raise concerns about a PIP with People & Culture without fear of retaliation.

5.5 Promotions & Career Progression
Promotions are considered twice a year. Based on sustained performance (minimum 2 consecutive cycles at 'Meets Expectations' or above), demonstrated capability at next level, and business need. Includes salary revision of 15–30% and updated ESOP grants. Counter-offers from external offers are not the basis for promotions.

5.6 Recognition & Awards
• TechStar Award: Quarterly company-wide award (trophy, INR 10,000 / USD 120 gift card, newsletter feature).
• Team Wins: Celebrated in All-Hands meetings.
• Peer-to-Peer Recognition: Slack recognition bot with monthly rewards.
• Tenure Milestones: Special recognition at 1, 3, and 5 years of service.`
  },
  {
    title: 'Code of Conduct Policy (HR-COC-001)',
    category: 'Conduct',
    access_level: 'global',
    content: `CHAPTER 06: Code of Conduct
Policy ID: HR-COC-001
Owner: CEO / Head of People

6.1 Professional Behaviour Standards
Every TechCo employee is expected to conduct themselves with integrity, professionalism, and respect in all interactions. This includes treating all individuals with dignity, maintaining honesty, using company resources responsibly, protecting confidential information, and complying with all applicable laws.

6.2 Anti-Harassment & Anti-Discrimination Policy
TechCo has zero tolerance for harassment, bullying, or discrimination of any kind. Prohibited behaviour includes sexual harassment (under POSH Act, 2013 in India), verbal/physical/cyber bullying, discriminatory remarks, and retaliation.
TechCo has an Internal Committee (IC) under POSH. Complaints can be reported confidentially to posh@techco.com.

6.3 Conflict of Interest
Employees must avoid situations where personal interests conflict with TechCo responsibilities. Includes:
• Holding financial interest in a direct competitor without disclosure.
• Outside employment/consulting that competes or uses company resources.
• Participating in decisions benefiting family members.
• Accepting gifts/hospitality beyond de minimis threshold (INR 2,000 / USD 25).
Disclose conflicts in writing to manager and HR.

6.4 Confidentiality & Data Privacy
Never share confidential info with unauthorised parties. Use approved tools. Confidentiality obligations survive employment. Employee data is processed under applicable data protection laws.

6.5 Social Media & Communication
Personal views shared online must be identified as personal. Never post confidential company info, unreleased product details, or disparage colleagues/customers.

6.6 Disciplinary Process
Progressive discipline framework:
• Step 1: Verbal Warning (minor policy deviation, first offence) → Documented in HRMS
• Step 2: Written Warning (repeated minor violations, moderate misconduct) → Formal letter in file
• Step 3: Final Written Warning / Suspension (serious misconduct, repeated violations) → HR-witnessed meeting
• Step 4: Termination (gross misconduct, theft, harassment, fraud, AWOL) → Termination letter
Gross misconduct may result in immediate termination without prior warning.

6.7 Grievance Redressal Mechanism
Channels to raise a grievance:
• Direct Manager: First point of contact.
• HR Business Partner: For manager/cross-team issues.
• People & Culture Lead / Head of HR: For escalated or sensitive matters.
• Anonymous Grievance Portal: On intranet for anonymity.
• POSH Internal Committee: For sexual harassment.
Grievances acknowledged within 48 hours and resolved within 30 working days. Retaliation is strictly prohibited.

6.8 Termination & Exit Policy
Resignation Notice Periods:
• L1–L2: 30 days
• L3–L4: 45 days
• L5 and above: 60 days
• During probation: 7 days
Exit Process: Written resignation acceptance, KT plan within 5 days, asset return, exit interview, Full & Final (FnF) settlement within 30 days, experience & relieving letter within 7 days of FnF.
Non-Compete & Non-Solicitation: 12 months customer/employee non-solicitation post-employment. 6 months non-compete for same product category.`
  }
];

async function runIngestion() {
  console.log('🚀 Starting ingestion of TechCo Employee Handbook & HR Policy Manual...\n');

  for (const item of policiesToIngest) {
    console.log(`📌 Processing Policy: "${item.title}" (${item.category})...`);

    // 1. Create policy
    const { data: policy, error: policyError } = await supabaseAdmin
      .from('policies')
      .insert({ title: item.title, category: item.category })
      .select('id')
      .single();

    if (policyError) {
      console.error(`❌ Policy creation failed for ${item.title}:`, policyError);
      continue;
    }

    // 2. Create policy version
    const { data: version, error: versionError } = await supabaseAdmin
      .from('policy_versions')
      .insert({
        policy_id: policy.id,
        valid_from: new Date().toISOString(),
        access_level: item.access_level,
      })
      .select('id')
      .single();

    if (versionError) {
      console.error(`❌ Version creation failed for ${item.title}:`, versionError);
      continue;
    }

    // 3. Chunk text
    const chunks = chunkText(item.content, 500);
    console.log(`   └─ Split into ${chunks.length} chunks`);

    // 4. Embed each chunk
    const chunkRows = [];
    for (let i = 0; i < chunks.length; i++) {
      console.log(`   └─ Generating 3072-dim embedding for chunk ${i + 1}/${chunks.length}...`);
      const embedding = await generateEmbedding(chunks[i]);
      chunkRows.push({
        version_id: version.id,
        chunk_text: chunks[i],
        embedding: JSON.stringify(embedding),
        chunk_index: i,
      });
    }

    // 5. Insert chunks
    const { error: chunksError } = await supabaseAdmin
      .from('policy_chunks')
      .insert(chunkRows);

    if (chunksError) {
      console.error(`❌ Chunks insertion failed for ${item.title}:`, chunksError);
    } else {
      console.log(`✅ Ingested "${item.title}" successfully with ${chunkRows.length} vector chunks!\n`);
    }
  }

  console.log('🎉 ALL TECHCO HR POLICIES INGESTED SUCCESSFULLY INTO SUPABASE!');
  process.exit(0);
}

runIngestion();

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Task, Estimate } from '../types';

interface SOWData {
  projectName: string;
  projectSummary: string;
  estimate: Estimate;
  tasks: Task[];
  timeline: { weeks: number; startDate: Date; endDate: Date };
}

export function exportToSOWPDF(data: SOWData) {
  const doc = new jsPDF();

  // Colors matching SCS branding
  const primaryColor: [number, number, number] = [30, 64, 175]; // portfolio blue

  const hourlyRate = 125; // blended rate from SCS SOW
  const selectedTasks = data.tasks.filter((t) => t.selected !== false);
  const totalHours = Math.round(
    selectedTasks.reduce((sum, t) => sum + t.baseHours * t.multiplier, 0)
  );
  const totalCost = totalHours * hourlyRate;

  // Helper to add header to each page
  const addPageHeader = (pageNum: number) => {
    doc.setPage(pageNum);
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, 210, 40, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('SANTACRUZ', 105, 16, { align: 'center' });

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text('Multiplatform Media Design', 105, 34, { align: 'center' });
    doc.text('santacruzstudios.com', 105, 38, { align: 'center' });

    // Important notice footer on each page
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);
    doc.text(
      'IMPORTANT NOTICE: The enclosed material is proprietary to SantaCruzStudios. This material is presented for the purpose of evaluating services and may not be disclosed in any manner to anyone other than the addressee and employees or authorized representatives of client named here within.',
      105,
      290,
      { align: 'center', maxWidth: 190 }
    );
  };

  // === COVER PAGE ===
  addPageHeader(1);
  doc.setTextColor(0, 0, 0);
  let yPos = 60;

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('DIGITAL BRANDING PACKAGE', 105, yPos, { align: 'center' });
  yPos += 8;
  doc.text('BY SANTA CRUZ STUDIOS LLC.', 105, yPos, { align: 'center' });
  yPos += 20;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text('Presented to:', 20, yPos);
  yPos += 8;
  
  // Editable client name field (placeholder text)
  doc.setDrawColor(200, 200, 200);
  doc.rect(20, yPos - 2, 170, 8, 'S');
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(150, 150, 150);
  doc.text('add your name here', 25, yPos + 4);
  yPos += 15;

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text('Submitted by:', 20, yPos);
  yPos += 8;
  doc.text('Michael Stewman // 831.818.6191', 20, yPos);
  yPos += 5;
  doc.text('michael@santacruzstudios.com', 20, yPos);

  // === TABLE OF CONTENTS PAGE ===
  doc.addPage();
  addPageHeader(2);
  doc.setTextColor(0, 0, 0);
  yPos = 60;

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Table of Contents', 20, yPos);
  yPos += 15;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  const tocItems = [
    { title: 'Statement of Work', page: 3 },
    { title: 'Project Overview', page: 3 },
    { title: 'Project Objectives', page: 3 },
    { title: 'Deliverables', page: 3 },
    { title: 'Project Team', page: 4 },
    { title: 'Process', page: 4 },
    { title: 'Project Costs', page: 5 },
    { title: 'Timeline', page: 5 },
    { title: 'Contract Terms', page: 6 },
    { title: 'Agreement & Signatures', page: 7 },
  ];

  tocItems.forEach((item) => {
    doc.text(item.title, 20, yPos);
    doc.text(`...${item.page}`, 190, yPos, { align: 'right' });
    yPos += 7;
  });

  // === STATEMENT OF WORK PAGE ===
  doc.addPage();
  addPageHeader(3);
  doc.setTextColor(0, 0, 0);
  yPos = 60;

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('STATEMENT OF WORK', 20, yPos);
  yPos += 12;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  const sowIntro =
    'Upon acceptance of this agreement, Santa Cruz Studios (SCS) will undertake the activities outlined ' +
    'in this Statement of Work in support of your business. We need to have a clear understanding regarding ' +
    'the nature and extent of services to be provided by SCS, and to agree upon the responsibilities with ' +
    'respect to this project. This document is the basis for that agreement, please read it carefully.';
  const sowLines = doc.splitTextToSize(sowIntro, 170);
  doc.text(sowLines, 20, yPos);
  yPos += sowLines.length * 5 + 10;

  // === PROJECT OVERVIEW ===
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('PROJECT OVERVIEW', 20, yPos);
  yPos += 10;

  // === PROJECT OBJECTIVES ===
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('PROJECT OBJECTIVES', 20, yPos);
  yPos += 8;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  
  // Generate objectives based on project summary and answers
  const objectives = [
    data.projectSummary 
      ? `Redesign or establish the digital presence for "${data.projectName}" with the highest design standards in mind, incorporating: ${data.projectSummary.substring(0, 100)}...`
      : `Redesign or establish a digital presence for "${data.projectName}" that reflects the brand at a high visual standard.`,
    'Define a clear, user-centered experience across key journeys and touchpoints.',
    'Deliver a flexible, maintainable website or product that the client team can update and manage moving forward.',
    'Align design, content, and technology around measurable business goals and project requirements.'
  ];

  objectives.forEach((obj) => {
    const lines = doc.splitTextToSize(obj, 170);
    doc.text(`+ ${lines[0]}`, 20, yPos);
    for (let i = 1; i < lines.length; i++) {
      yPos += 5;
      doc.text(`  ${lines[i]}`, 20, yPos);
    }
    yPos += 6;
  });
  yPos += 4;

  // === DELIVERABLES ===
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('DELIVERABLES', 20, yPos);
  yPos += 8;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  
  const deliverableList = [
    '+ Static design mocks for review, during the conceiting phase',
    '+ Posted review URLs',
    '+ Content management system, with the ability to update copy. (Additional features available by demand and strictly defined under the change order terms)',
    '+ Hosted working live site',
    '+ Project milestones on time and on budget*'
  ];

  deliverableList.forEach((item) => {
    const lines = doc.splitTextToSize(item, 170);
    doc.text(lines, 20, yPos);
    yPos += lines.length * 5 + 3;
  });

  yPos += 5;
  doc.setFont('helvetica', 'bold');
  doc.text('FIXED BID', 20, yPos);
  yPos += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('This project will be set to a fixed bid. Any additional hours will be billed under the change order guidelines', 20, yPos);
  yPos += 10;

  // Check if we need a new page
  if (yPos > 250) {
    doc.addPage();
    addPageHeader(4);
    yPos = 60;
  }

  // === PROJECT TEAM ===
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('PROJECT TEAM', 20, yPos);
  yPos += 8;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  const teamMembers = [
    'Michael Stewman – Creative Director, UX/UI and Brand guide.',
    'Leon Atkinson – Technical Director, Backend and frontend developer',
    'Mike Ross – Professional Photographer'
  ];

  teamMembers.forEach((member) => {
    doc.text(`+ ${member}`, 20, yPos);
    yPos += 6;
  });
  yPos += 4;

  // === PROCESS ===
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('PROCESS', 20, yPos);
  yPos += 8;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  const processItems = [
    'At the beginning of every week, an email will be sent to the client, detailing the week\'s production tasks and deliverables, this is a time for over communication and setting of expectations. Calls may be requested if questions arise.',
    'At the end of every week the project manager and respective lead for that phase will have a call with the client to discuss the site and present progress.',
    'This can include creative and technical review of progress / updates and additions to the site.'
  ];

  processItems.forEach((item) => {
    const lines = doc.splitTextToSize(item, 170);
    doc.text(`+ ${lines[0]}`, 20, yPos);
    for (let i = 1; i < lines.length; i++) {
      yPos += 5;
      doc.text(`  ${lines[i]}`, 20, yPos);
    }
    yPos += 6;
  });

  // === PROJECT COSTS PAGE ===
  doc.addPage();
  addPageHeader(5);
  yPos = 60;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('PROJECT COSTS - @ BLENDED RATE OF $125/HR', 20, yPos);
  yPos += 10;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(
    'Invoice for 1/3 the project budget will be submitted upon approval of this statement of work and production will begin as soon as the initial deposit is received.',
    20,
    yPos
  );
  yPos += 8;
  doc.text(
    'The second third of the agreed budget will be invoiced upon final approval of the design phase, and is due within 30 days of the date submitted.',
    20,
    yPos
  );
  yPos += 8;
  doc.text(
    'Final payment will be invoiced after project is completed and live and is due within 30 days of the date submitted.',
    20,
    yPos
  );
  yPos += 12;

  // Group tasks by category for cost table
  const taskCategories = new Map<string, { hours: number; tasks: Task[] }>();
  
  selectedTasks.forEach((task) => {
    const hours = Math.round(task.baseHours * task.multiplier);
    const existing = taskCategories.get(task.category) || { hours: 0, tasks: [] };
    taskCategories.set(task.category, {
      hours: existing.hours + hours,
      tasks: [...existing.tasks, task]
    });
  });

  // Build cost table
  const costTableBody: string[][] = [];
  taskCategories.forEach((data, category) => {
    costTableBody.push([category, `${data.hours}`, `$${(data.hours * hourlyRate).toLocaleString()}`]);
  });
  
  costTableBody.push(['Total Cost', `${totalHours}`, `$${totalCost.toLocaleString()}`]);

  autoTable(doc, {
    startY: yPos,
    head: [['Services', 'Hours', 'Cost']],
    body: costTableBody,
    theme: 'striped',
    headStyles: { fillColor: [primaryColor[0], primaryColor[1], primaryColor[2]], textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 10 },
    margin: { left: 20, right: 20 }
  });

  yPos = (doc as any).lastAutoTable.finalY + 10;

  // === TIMELINE ===
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('TIMELINE', 20, yPos);
  yPos += 8;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  
  const startDate = data.timeline.startDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const endDate = data.timeline.endDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  
  doc.text(`+ ${data.timeline.weeks} week timeline`, 20, yPos);
  yPos += 6;
  doc.text(`+ Project start: ${startDate}`, 20, yPos);
  yPos += 6;
  doc.text(`+ Estimated completion: ${endDate}`, 20, yPos);
  yPos += 6;
  doc.text('+ A date specific schedule outline to be completed by SCS project management team and provided to client upon approval*', 20, yPos);

  // === CONTRACT TERMS PAGE ===
  doc.addPage();
  addPageHeader(6);
  yPos = 60;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('CONTRACT TERMS', 20, yPos);
  yPos += 10;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');

  const contractTerms = [
    {
      title: 'PAYMENT TERMS:',
      text: 'Client shall pay Company the fees in the amount and on the timing as specified in each applicable SOW, or invoice, including, but not limited to, compensation for the Services and all reasonable out-of-pocket expenses incurred in the performance of the Services, and for any non-standard expenses [including support] incurred at the written request of Client. Payments made later than the due date set forth in the applicable SOW or invoice will accrue interest from the date due to the date paid at the lesser rate of eighteen percent (18%) per annum or the maximum allowed by applicable law. In the event Client fails to make a payment within ten (10) days from the date such payment is due, Company shall be entitled to suspend performance of the Services and, at its option, terminate the relevant SOW by written notice.'
    },
    {
      title: 'DELIVERABLES:',
      text: 'All Deliverables provided by Company to Client shall be deemed to be accepted within 5 days of receipt by Client unless Company receives written notice of non-acceptance within 5 days after delivery. Any notice of non-acceptance must state in reasonable detail how the Deliverables did not conform to the Statement of Work and Company shall use its reasonable business efforts to correct any deficiencies in the Deliverables so that they conform to the Statement of Work within 30 days of non-acceptance notice by Client. Client shall not withhold any payment for Services except for material and substantial non-conformity with the Statement of Work.'
    },
    {
      title: 'TERMINATION:',
      text: 'Either party may, in its sole discretion, terminate this Agreement after the Services have been completed in any existing SOW by providing prior written notice to the other party hereto. The provisions of this Agreement shall continue to apply to all ongoing Statements of Work. Either party may terminate this Agreement upon written notice to the other party if the other party: (a) materially breaches this Agreement, and such breach remains uncured more than thirty (30) days after receipt of written notice of such breach; (b) makes an assignment of substantially all of its assets for the benefit of its creditors; or (c) either (i) files a voluntary petition for relief under 11 U.S.C. 101 et seq. (the "Bankruptcy Code") which is not dismissed or withdrawn within sixty (60) days or (ii) has an involuntary petition for relief under the Bankruptcy Code filed against it.'
    },
    {
      title: 'LIMITATION OF LIABILITY:',
      text: 'Neither party shall be liable for any consequential, indirect, special or incidental damages, such as damages for lost profits, business failure or loss arising out of use of the Deliverables or the Services, whether or not advised of the possibility of such damages. Company\'s total liability arising out of this Agreement and the provision of the Services shall be limited to the fees received by Company within the twelve (12) month period immediately prior to the event giving rise to such liability paid under the applicable Statement of Work under which such liability arises.'
    },
    {
      title: 'INTELLECTUAL PROPERTY:',
      text: 'A separate license agreement (s) will be executed and attached to this document if Company uses any pre-existing software or other intellectual property in developing the proposed solution for Client. Provided that there is no release of any confidential information regarding the Client\'s business or methods of operation, Company will be allowed to reuse general work product or any rejected or unused marketing, advertising, or technology plans, designs, ideas, and code developed by Company under this Agreement.'
    },
    {
      title: 'FORCE MAJEURE:',
      text: 'Neither party shall be in default of any obligation under this Agreement to the extent performance of such obligation is prevented or delayed by a Force Majeure Event. For purposes of this section, Force Majeure Events include fire, flood, explosion, strike, war, insurrection, embargo, government requirement, act of civil or military authority, act of God, or any similar event, occurrence or condition which is not caused, in whole or in part, by that party, and which is beyond the reasonable control of that party.'
    },
    {
      title: 'RELATIONSHIP:',
      text: 'The relationship of the parties is that of independent contractors. Each party, its employees and agents, shall not be deemed to be employees, agents, joint ventures or partners of the other and shall not have the authority to bind the other.'
    },
    {
      title: 'GOVERNING LAW:',
      text: 'This Agreement shall be governed by and construed in accordance with the laws of the State of California, without reference to conflict of law principles.'
    }
  ];

  contractTerms.forEach((term) => {
    doc.setFont('helvetica', 'bold');
    doc.text(term.title, 20, yPos);
    yPos += 5;
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(term.text, 170);
    doc.text(lines, 20, yPos);
    yPos += lines.length * 4 + 4;
  });

  // === AGREEMENT & SIGNATURES PAGE ===
  doc.addPage();
  addPageHeader(7);
  yPos = 60;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('AGREEMENT', 20, yPos);
  yPos += 8;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const agreementText =
    'This Agreement, including the SOWs and/or License Agreement, contains the entire agreement between Company and Client with regard to the subject matter hereof and supersedes all prior agreements between the parties. Company and Client acknowledge that no representations, inducements, promises, or agreements, orally or otherwise, have been made by Company or Client regarding the subject matter hereof which are not contained in this Agreement, and that no other agreement, statement, or promise not contained herein shall be valid or binding. This agreement will continue in effect from the effective date hereof, until terminated in writing by either party. Any changes to this agreement must be in writing and signed by both parties. This Agreement shall be governed in all respects by and construed in accordance with the laws of the state of California.';
  
  const agreementLines = doc.splitTextToSize(agreementText, 170);
  doc.text(agreementLines, 20, yPos);
  yPos += agreementLines.length * 4 + 15;

  // Signature section
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`AGREEMENT: ${data.projectName.toUpperCase()} – SOW 1`, 20, yPos);
  yPos += 15;

  // Client signature
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setDrawColor(0, 0, 0);
  doc.line(20, yPos, 100, yPos);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(150, 150, 150);
  doc.text('add your name here', 20, yPos - 2);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text('Client Name / Title', 20, yPos + 6);
  doc.text('Dated:', 20, yPos + 12);
  doc.line(20, yPos + 11, 100, yPos + 11);

  // SCS signature
  doc.line(110, yPos, 190, yPos);
  doc.text('Michael Stewman', 110, yPos + 6);
  doc.text('Creative Director, SCS', 110, yPos + 12);
  doc.text('Dated:', 110, yPos + 18);
  doc.line(110, yPos + 17, 190, yPos + 17);

  // Add page numbers to all pages
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(`Page ${i} of ${pageCount}`, 195, 290, { align: 'right' });
  }

  // Save PDF
  const fileName = `SOW-${data.projectName.replace(/\s+/g, '-')}-${new Date()
    .toISOString()
    .split('T')[0]}.pdf`;
  doc.save(fileName);
}

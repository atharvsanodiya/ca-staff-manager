-- Rich realistic seed tasks for CA Practice Management

INSERT OR IGNORE INTO tasks (id, title, description, category_id, priority, status, deadline, reminder_at, created_by, created_at)
VALUES 
(2, 'GSTR-3B Monthly Filing - Alpha Tech Solutions Pvt Ltd', 'Reconcile 2B with purchase books, compute ITC reversal under Rule 42/43, and generate challan for outward supply liability.', 4, 'urgent', 'in_progress', '2026-11-20', '2026-11-18 10:00:00', 1, '2026-11-01 09:30:00'),
(3, 'Form 26Q TDS Return Filing Q2 - Horizon Infra EPC Ltd', 'Verify Section 194C, 194J, and 194Q challans. Validate PAN accuracy via TRACES portal before final .fvu generation.', 2, 'high', 'pending', '2026-11-07', '2026-11-05 11:00:00', 1, '2026-11-01 10:15:00'),
(4, 'Tax Audit Report (Form 3CA-3CD) & ITR-6 - Apex Logistics Group', 'Examine clause-by-clause disallowances under Section 43B, 40(a)(ia), and MSME payment delays under Section 43B(h).', 1, 'urgent', 'in_progress', '2026-11-15', '2026-11-12 09:00:00', 1, '2026-11-01 11:00:00'),
(5, 'Monthly Books Finalization & Bank Reco - Zenith Retail Ventures', 'Complete October ledger scrutinies, reconcile 4 current bank accounts, verify GST vs Tally turnover differences.', 3, 'medium', 'completed', '2026-11-10', NULL, 1, '2026-10-25 14:00:00'),
(6, 'CMA Data & Project Appraisal Report - SBI ₹15 Cr Working Capital Limit', 'Prepare 5-year projected balance sheet, MPBF calculation, DSCR, and ratio analysis for loan renewal with State Bank of India.', 5, 'high', 'in_progress', '2026-11-25', '2026-11-22 10:00:00', 1, '2026-11-01 12:30:00'),
(7, 'ROC Annual Return Filing (AOC-4 & MGT-7) - Nova Green Tech Ltd', 'Draft director report disclosures, financial statement tagging in XBRL, and prepare board resolution extracts.', 6, 'medium', 'pending', '2026-11-29', '2026-11-26 15:00:00', 1, '2026-11-01 13:00:00');

-- Assignments for Task 2 (Alpha Tech GSTR-3B)
INSERT OR IGNORE INTO task_assignments (task_id, user_id, status, notes, assigned_at)
VALUES 
(2, 2, 'in_progress', 'Purchase register matched with GSTR-2B. Found ₹1.42L ineligible ITC.', '2026-11-01 09:35:00'),
(2, 3, 'pending', 'Awaiting final sales summary from client accountant.', '2026-11-01 09:35:00');

-- Assignments for Task 3 (Horizon Infra TDS)
INSERT OR IGNORE INTO task_assignments (task_id, user_id, status, notes, assigned_at)
VALUES 
(3, 3, 'pending', 'Challan BSR codes downloaded from OLTAS. Awaiting PAN verification.', '2026-11-01 10:20:00');

-- Assignments for Task 4 (Apex Logistics Tax Audit)
INSERT OR IGNORE INTO task_assignments (task_id, user_id, status, notes, assigned_at)
VALUES 
(4, 2, 'in_progress', 'Depreciation schedules verified as per IT Act 1961.', '2026-11-01 11:15:00'),
(4, 4, 'in_progress', 'Checking MSME 45-day payment compliance under Sec 43B(h).', '2026-11-01 11:15:00'),
(4, 5, 'pending', 'Drafting Form 3CD annexures for Section 269ST & 269SS.', '2026-11-01 11:15:00');

-- Assignments for Task 5 (Zenith Retail Bookkeeping - Completed)
INSERT OR IGNORE INTO task_assignments (task_id, user_id, status, completed_at, notes, assigned_at)
VALUES 
(5, 4, 'completed', '2026-10-31 18:00:00', 'All 4 bank statements reconciled. Difference ₹0.', '2026-10-25 14:10:00'),
(5, 6, 'completed', '2026-10-31 17:30:00', 'Fixed asset register updated and physical verification noted.', '2026-10-25 14:10:00');

-- Assignments for Task 6 (CMA Project Report)
INSERT OR IGNORE INTO task_assignments (task_id, user_id, status, notes, assigned_at)
VALUES 
(6, 2, 'in_progress', 'Historical 3-year audited financials entered into CMA format.', '2026-11-01 12:45:00'),
(6, 6, 'in_progress', 'Sensitivity analysis for raw material cost inflation ready.', '2026-11-01 12:45:00');

-- Assignments for Task 7 (ROC Filing)
INSERT OR IGNORE INTO task_assignments (task_id, user_id, status, notes, assigned_at)
VALUES 
(7, 3, 'pending', 'Draft AOC-4 prepared. Waiting for signed auditor report copy.', '2026-11-01 13:05:00');

-- Audit logs
INSERT OR IGNORE INTO activity_log (user_id, action, entity_type, entity_id, details, created_at)
VALUES 
(1, 'created', 'task', 2, 'Created statutory assignment: GSTR-3B Monthly Filing - Alpha Tech', '2026-11-01 09:30:00'),
(2, 'assignment_in_progress', 'task', 2, 'Rahul Sharma started work on GSTR-2B reconciliation', '2026-11-01 10:15:00'),
(1, 'created', 'task', 4, 'Created audit assignment: Tax Audit Form 3CD - Apex Logistics', '2026-11-01 11:00:00'),
(4, 'assignment_completed', 'task', 5, 'Amit Kumar finalized October Bank Reconciliation for Zenith', '2026-10-31 18:00:00');

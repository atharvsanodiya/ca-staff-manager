-- Seed categories
INSERT OR IGNORE INTO categories (name, color) VALUES ('ITR', '#ef4444');
INSERT OR IGNORE INTO categories (name, color) VALUES ('TDS', '#f97316');
INSERT OR IGNORE INTO categories (name, color) VALUES ('Bookkeeping', '#eab308');
INSERT OR IGNORE INTO categories (name, color) VALUES ('GST', '#22c55e');
INSERT OR IGNORE INTO categories (name, color) VALUES ('Project Report', '#3b82f6');
INSERT OR IGNORE INTO categories (name, color) VALUES ('Other', '#8b5cf6');

-- Seed admin user (password: admin123)
-- Hash generated with SHA-256 + salt for demo purposes
INSERT OR IGNORE INTO users (username, password_hash, full_name, email, role, phone)
VALUES ('akshay', 'ee28031b5c06e3be85778fd1ed2e80156a7a69d4bef2c7bf990dbba00aec3679', 'CA Akshay Malu', 'akshay@camalu.in', 'admin', '9820012345');

INSERT OR IGNORE INTO users (username, password_hash, full_name, email, role, phone)
VALUES ('admin', 'ee28031b5c06e3be85778fd1ed2e80156a7a69d4bef2c7bf990dbba00aec3679', 'CA Akshay Malu', 'admin@camalu.in', 'admin', '9820012345');

-- Seed staff users (password: staff123)
INSERT OR IGNORE INTO users (username, password_hash, full_name, email, role, phone)
VALUES ('rahul', 'a7f216591048c03ad158035f38a54b4eb25626632dd27cdc0b238e38a2b344a7', 'Rahul Sharma', 'rahul@castaffmanager.com', 'staff', '9876543210');

INSERT OR IGNORE INTO users (username, password_hash, full_name, email, role, phone)
VALUES ('priya', 'a7f216591048c03ad158035f38a54b4eb25626632dd27cdc0b238e38a2b344a7', 'Priya Patel', 'priya@castaffmanager.com', 'staff', '9876543211');

INSERT OR IGNORE INTO users (username, password_hash, full_name, email, role, phone)
VALUES ('amit', 'a7f216591048c03ad158035f38a54b4eb25626632dd27cdc0b238e38a2b344a7', 'Amit Kumar', 'amit@castaffmanager.com', 'staff', '9876543212');

INSERT OR IGNORE INTO users (username, password_hash, full_name, email, role, phone)
VALUES ('sneha', 'a7f216591048c03ad158035f38a54b4eb25626632dd27cdc0b238e38a2b344a7', 'Sneha Gupta', 'sneha@castaffmanager.com', 'staff', '9876543213');

INSERT OR IGNORE INTO users (username, password_hash, full_name, email, role, phone)
VALUES ('vikram', 'a7f216591048c03ad158035f38a54b4eb25626632dd27cdc0b238e38a2b344a7', 'Vikram Singh', 'vikram@castaffmanager.com', 'staff', '9876543214');

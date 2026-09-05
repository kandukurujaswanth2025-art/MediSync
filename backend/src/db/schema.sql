CREATE TABLE IF NOT EXISTS hospitals (
    id VARCHAR(50) PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    recovery_email VARCHAR(150),
    description TEXT,
    tagline VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    hospital_id VARCHAR(50),
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    phone VARCHAR(20),
    password_hash TEXT NOT NULL,
    role VARCHAR(30) NOT NULL,
    age INTEGER,
    gender VARCHAR(20),
    recovery_email VARCHAR(150),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_user_hospital
        FOREIGN KEY (hospital_id)
        REFERENCES hospitals(id)
        ON DELETE CASCADE,

    CONSTRAINT check_user_role
        CHECK (role IN ('HOSPITAL', 'RESOURCE_MANAGER', 'PATIENT'))
);

CREATE TABLE IF NOT EXISTS departments (
    id VARCHAR(100) PRIMARY KEY,
    hospital_id VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_department_hospital
        FOREIGN KEY (hospital_id)
        REFERENCES hospitals(id)
        ON DELETE CASCADE,

    CONSTRAINT unique_department_per_hospital
        UNIQUE (hospital_id, name)
);

CREATE TABLE IF NOT EXISTS resources (
    id VARCHAR(100) PRIMARY KEY,
    hospital_id VARCHAR(50) NOT NULL,
    department_id VARCHAR(100),
    department_name VARCHAR(100),
    type VARCHAR(30) NOT NULL,
    name VARCHAR(150) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    min_stock INTEGER NOT NULL DEFAULT 0,
    unit VARCHAR(50) DEFAULT 'units',
    status VARCHAR(30) NOT NULL DEFAULT 'AVAILABLE',
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_resource_hospital
        FOREIGN KEY (hospital_id)
        REFERENCES hospitals(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_resource_department
        FOREIGN KEY (department_id)
        REFERENCES departments(id)
        ON DELETE SET NULL,

    CONSTRAINT check_resource_type
        CHECK (type IN ('medicine', 'equipment')),

    CONSTRAINT check_resource_quantity
        CHECK (quantity >= 0),

    CONSTRAINT check_resource_min_stock
        CHECK (min_stock >= 0)
);

CREATE TABLE IF NOT EXISTS queue_entries (
    id VARCHAR(100) PRIMARY KEY,
    hospital_id VARCHAR(50) NOT NULL,
    patient_id VARCHAR(50),
    patient_name VARCHAR(150) NOT NULL,
    problem TEXT NOT NULL,
    token VARCHAR(30) NOT NULL,
    registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(30) NOT NULL DEFAULT 'WAITING',
    medicine_order_id VARCHAR(100),
    priority VARCHAR(30) NOT NULL DEFAULT 'NORMAL',

    CONSTRAINT fk_queue_hospital
        FOREIGN KEY (hospital_id)
        REFERENCES hospitals(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_queue_patient
        FOREIGN KEY (patient_id)
        REFERENCES users(id)
        ON DELETE SET NULL,

    CONSTRAINT check_queue_status
        CHECK (
            status IN (
                'WAITING',
                'CALLED',
                'IN_CONSULTATION',
                'COMPLETED'
            )
        ),

    CONSTRAINT check_queue_priority
        CHECK (priority IN ('NORMAL', 'EMERGENCY')),

    CONSTRAINT unique_token_per_hospital
        UNIQUE (hospital_id, token)
);

CREATE TABLE IF NOT EXISTS medicine_orders (
    id VARCHAR(100) PRIMARY KEY,
    hospital_id VARCHAR(50) NOT NULL,
    patient_id VARCHAR(50),
    patient_name VARCHAR(150) NOT NULL,
    queue_entry_id VARCHAR(100),
    status VARCHAR(40) NOT NULL DEFAULT 'READY_FOR_COLLECTION',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_order_hospital
        FOREIGN KEY (hospital_id)
        REFERENCES hospitals(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_order_patient
        FOREIGN KEY (patient_id)
        REFERENCES users(id)
        ON DELETE SET NULL,

    CONSTRAINT fk_order_queue
        FOREIGN KEY (queue_entry_id)
        REFERENCES queue_entries(id)
        ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS medicine_order_items (
    id BIGSERIAL PRIMARY KEY,
    order_id VARCHAR(100) NOT NULL,
    medicine_id VARCHAR(100) NOT NULL,
    medicine_name VARCHAR(150) NOT NULL,
    quantity INTEGER NOT NULL,

    CONSTRAINT fk_order_item_order
        FOREIGN KEY (order_id)
        REFERENCES medicine_orders(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_order_item_medicine
        FOREIGN KEY (medicine_id)
        REFERENCES resources(id)
        ON DELETE RESTRICT,

    CONSTRAINT check_order_quantity
        CHECK (quantity > 0)
);

CREATE TABLE IF NOT EXISTS resource_requests (
    id VARCHAR(100) PRIMARY KEY,
    hospital_id VARCHAR(50) NOT NULL,
    resource_name VARCHAR(150) NOT NULL,
    quantity INTEGER NOT NULL,
    reason TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_request_hospital
        FOREIGN KEY (hospital_id)
        REFERENCES hospitals(id)
        ON DELETE CASCADE,

    CONSTRAINT check_request_status
        CHECK (
            status IN (
                'PENDING',
                'APPROVED',
                'COMPLETED',
                'REJECTED'
            )
        ),

    CONSTRAINT check_request_quantity
        CHECK (quantity > 0)
);

CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(150) PRIMARY KEY,
    hospital_id VARCHAR(50) NOT NULL,
    scope VARCHAR(30) NOT NULL,
    target_id VARCHAR(50),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_notification_hospital
        FOREIGN KEY (hospital_id)
        REFERENCES hospitals(id)
        ON DELETE CASCADE,

    CONSTRAINT check_notification_scope
        CHECK (
            scope IN (
                'hospital',
                'manager',
                'patient'
            )
        )
);

CREATE TABLE IF NOT EXISTS stock_history (
    id VARCHAR(150) PRIMARY KEY,
    hospital_id VARCHAR(50) NOT NULL,
    resource_id VARCHAR(100),
    resource_name VARCHAR(150) NOT NULL,
    change INTEGER NOT NULL,
    reason TEXT,
    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_stock_hospital
        FOREIGN KEY (hospital_id)
        REFERENCES hospitals(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_stock_resource
        FOREIGN KEY (resource_id)
        REFERENCES resources(id)
        ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS password_reset_otps (
    id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    otp_hash TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_otp_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_users_hospital
    ON users(hospital_id);

CREATE INDEX IF NOT EXISTS idx_users_role
    ON users(role);

CREATE INDEX IF NOT EXISTS idx_departments_hospital
    ON departments(hospital_id);

CREATE INDEX IF NOT EXISTS idx_resources_hospital
    ON resources(hospital_id);

CREATE INDEX IF NOT EXISTS idx_resources_type
    ON resources(type);

CREATE INDEX IF NOT EXISTS idx_queue_hospital
    ON queue_entries(hospital_id);

CREATE INDEX IF NOT EXISTS idx_queue_patient
    ON queue_entries(patient_id);

CREATE INDEX IF NOT EXISTS idx_queue_status
    ON queue_entries(status);

CREATE INDEX IF NOT EXISTS idx_orders_patient
    ON medicine_orders(patient_id);

CREATE INDEX IF NOT EXISTS idx_requests_hospital
    ON resource_requests(hospital_id);

CREATE INDEX IF NOT EXISTS idx_notifications_target
    ON notifications(target_id);

CREATE INDEX IF NOT EXISTS idx_notifications_hospital
    ON notifications(hospital_id);

CREATE INDEX IF NOT EXISTS idx_stock_hospital
    ON stock_history(hospital_id);

CREATE INDEX IF NOT EXISTS idx_otp_user
    ON password_reset_otps(user_id);
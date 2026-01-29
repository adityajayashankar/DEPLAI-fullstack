-- Create database
CREATE DATABASE IF NOT EXISTS deplai;
USE deplai;

-- =====================================================
-- Core Tables
-- =====================================================

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255),
    password_hash VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email)
);

-- GitHub installations
CREATE TABLE IF NOT EXISTS github_installations (
    id VARCHAR(36) PRIMARY KEY,
    installation_id BIGINT NOT NULL UNIQUE,
    account_login VARCHAR(255) NOT NULL,
    account_type VARCHAR(50) NOT NULL,
    user_id VARCHAR(36) NULL,
    installed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    suspended_at TIMESTAMP NULL,
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_account_login (account_login),
    INDEX idx_user_id (user_id),
    INDEX idx_installation_id (installation_id)
);

-- GitHub repositories
CREATE TABLE IF NOT EXISTS github_repositories (
    id VARCHAR(36) PRIMARY KEY,
    installation_id VARCHAR(36) NOT NULL,
    github_repo_id BIGINT NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    default_branch VARCHAR(255) DEFAULT 'main',
    is_private BOOLEAN NOT NULL,
    languages JSON,
    webhook_id BIGINT,
    last_synced_at TIMESTAMP NULL,
    metadata JSON,
    needs_refresh BOOLEAN DEFAULT TRUE,
    last_cloned_at TIMESTAMP NULL,
    last_commit_sha VARCHAR(40) NULL,
    last_push_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (installation_id) REFERENCES github_installations(id) ON DELETE CASCADE,
    UNIQUE KEY unique_repo (installation_id, github_repo_id),
    INDEX idx_full_name (full_name),
    INDEX idx_needs_refresh (needs_refresh),
    INDEX idx_github_repo_id (github_repo_id)
);

-- Projects (both GitHub and local)
CREATE TABLE IF NOT EXISTS projects (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    project_type VARCHAR(20) NOT NULL DEFAULT 'github',
    repository_id VARCHAR(36) NULL,
    local_path VARCHAR(500) NULL,
    file_count INT NULL,
    size_bytes BIGINT NULL,
    uploaded_at TIMESTAMP NULL,
    user_id VARCHAR(36) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (repository_id) REFERENCES github_repositories(id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_project_type (project_type),
    INDEX idx_user_type (user_id, project_type),
    INDEX idx_user_id (user_id)
);

-- GitHub access tokens (cached)
CREATE TABLE IF NOT EXISTS github_access_tokens (
    id VARCHAR(36) PRIMARY KEY,
    installation_id VARCHAR(36) NOT NULL,
    token_encrypted TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (installation_id) REFERENCES github_installations(id) ON DELETE CASCADE,
    INDEX idx_expires_at (expires_at),
    INDEX idx_installation (installation_id)
);

-- Runs (scan jobs)
CREATE TABLE IF NOT EXISTS runs (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36) NOT NULL,
    repository_id VARCHAR(36) NOT NULL,
    trigger_type VARCHAR(50) NOT NULL,
    git_ref VARCHAR(255),
    commit_sha VARCHAR(255),
    pr_number INT,
    status VARCHAR(50) DEFAULT 'pending',
    started_at TIMESTAMP NULL,
    finished_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (repository_id) REFERENCES github_repositories(id) ON DELETE CASCADE,
    INDEX idx_status (status),
    INDEX idx_created_at (created_at),
    INDEX idx_project_id (project_id),
    INDEX idx_trigger_type (trigger_type)
);

-- =====================================================
-- Verification Queries
-- =====================================================

-- Check all tables
SHOW TABLES;

-- Check table structures
DESCRIBE users;
DESCRIBE github_installations;
DESCRIBE github_repositories;
DESCRIBE projects;
DESCRIBE github_access_tokens;
DESCRIBE runs;

-- Check constraints
SELECT 
    TABLE_NAME,
    CONSTRAINT_NAME,
    CONSTRAINT_TYPE
FROM 
    INFORMATION_SCHEMA.TABLE_CONSTRAINTS
WHERE 
    TABLE_SCHEMA = 'deplai'
ORDER BY 
    TABLE_NAME, CONSTRAINT_TYPE;
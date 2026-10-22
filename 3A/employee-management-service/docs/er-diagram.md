# Entity relationship diagram

```mermaid
erDiagram
    DEPARTMENTS ||--o{ EMPLOYEES : contains
    EMPLOYEES o|--o{ EMPLOYEES : manages
    EMPLOYEES ||--o{ LEAVE_REQUESTS : requests
    EMPLOYEES o|--o{ LEAVE_REQUESTS : decides

    DEPARTMENTS {
        uuid id PK
        text name UK
        text description
    }
    EMPLOYEES {
        uuid id PK
        text first_name
        text last_name
        text email UK
        uuid department_id FK
        uuid manager_id FK
        text job_title
        date joining_date
        integer leave_balance
    }
    LEAVE_REQUESTS {
        uuid id PK
        uuid employee_id FK
        date start_date
        date end_date
        text reason
        text status
        uuid decided_by FK
        timestamptz decided_at
    }
```

`employees.manager_id` is a nullable self-reference, allowing top-level employees to have no manager. Department deletion is restricted while employees reference that department. A leave request is owned by one employee and may record the manager who decided it.

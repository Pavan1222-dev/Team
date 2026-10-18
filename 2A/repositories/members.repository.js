const DUPLICATE_EMAIL_CODE = 'MEMBER_EMAIL_CONFLICT';
const MEMBER_HAS_LOANS_CODE = 'MEMBER_HAS_LOANS';
const SORT_COLUMNS = Object.freeze({
  name: 'name',
  email: 'email',
  phone: 'phone',
  membershipType: 'membership_type',
});

function mapMember(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    membershipType: row.membership_type,
    createdAt: row.created_at,
  };
}

function findMemberById(database, id) {
  return database.get(
    `SELECT id, name, email, phone, membership_type, created_at
     FROM members WHERE id = ?`,
    id,
  );
}

function isDuplicateEmailError(error) {
  return error.code?.startsWith('SQLITE_CONSTRAINT') &&
    error.message.includes('UNIQUE constraint failed: members.email');
}

function repositoryConflict(code, message, cause) {
  const conflict = new Error(message, { cause });
  conflict.code = code;
  return conflict;
}

export function createMembersRepository(database) {
  return {
    async create(member) {
      try {
        const result = await database.run(
          `INSERT INTO members (name, email, phone, membership_type)
           VALUES (?, ?, ?, ?)`,
          member.name,
          member.email,
          member.phone,
          member.membershipType,
        );

        const row = await database.get(
          `SELECT id, name, email, phone, membership_type, created_at
           FROM members WHERE id = ?`,
          result.lastID,
        );
        return mapMember(row);
      } catch (error) {
        if (isDuplicateEmailError(error)) {
          throw repositoryConflict(
            DUPLICATE_EMAIL_CODE,
            'A member with this email already exists.',
            error,
          );
        }

        throw error;
      }
    },

    async list({ page, limit, sortBy, order }) {
      const total = await database.get('SELECT COUNT(*) AS totalItems FROM members');
      const sortColumn = SORT_COLUMNS[sortBy];
      const direction = order === 'desc' ? 'DESC' : 'ASC';
      const offset = (page - 1) * limit;
      const rows = await database.all(
        `SELECT id, name, email, phone, membership_type, created_at
         FROM members
         ORDER BY ${sortColumn} ${direction}, id ASC
         LIMIT ? OFFSET ?`,
        limit,
        offset,
      );

      return { members: rows.map(mapMember), totalItems: total.totalItems };
    },

    async getById(id) {
      const row = await findMemberById(database, id);
      return row ? mapMember(row) : null;
    },

    async update(id, changes) {
      const currentRow = await findMemberById(database, id);
      if (!currentRow) {
        return null;
      }
      const current = mapMember(currentRow);

      const updated = {
        name: changes.name ?? current.name,
        email: changes.email ?? current.email,
        phone: changes.phone ?? current.phone,
        membershipType: changes.membershipType ?? current.membershipType,
      };

      try {
        const result = await database.run(
          `UPDATE members
           SET name = ?, email = ?, phone = ?, membership_type = ?
           WHERE id = ?`,
          updated.name,
          updated.email,
          updated.phone,
          updated.membershipType,
          id,
        );
        if (result.changes === 0) {
          return null;
        }
      } catch (error) {
        if (isDuplicateEmailError(error)) {
          throw repositoryConflict(
            DUPLICATE_EMAIL_CODE,
            'A member with this email already exists.',
            error,
          );
        }

        throw error;
      }

      const row = await findMemberById(database, id);
      return row ? mapMember(row) : null;
    },

    async delete(id) {
      try {
        const result = await database.run('DELETE FROM members WHERE id = ?', id);
        return result.changes > 0;
      } catch (error) {
        if (
          error.code?.startsWith('SQLITE_CONSTRAINT') &&
          error.message.includes('FOREIGN KEY constraint failed')
        ) {
          throw repositoryConflict(
            MEMBER_HAS_LOANS_CODE,
            'This member cannot be deleted because loan records reference them.',
            error,
          );
        }

        throw error;
      }
    },
  };
}

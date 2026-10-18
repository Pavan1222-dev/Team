import { readFile, writeFile, rename } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { dirname, join } from 'node:path';
import { mkdir } from 'node:fs/promises';

// Each repository owns one JSON file. Writes use a temporary file and rename
// so a process interruption cannot leave a partially written collection.
export class JsonRepository {
  constructor(filePath) {
    this.filePath = filePath;
    this.writeQueue = Promise.resolve();
  }

  async readAll() {
    try {
      const contents = await readFile(this.filePath, 'utf8');
      const rows = JSON.parse(contents);
      if (!Array.isArray(rows)) throw new Error('Expected a JSON array');
      return rows;
    } catch (error) {
      if (error.code === 'ENOENT') return [];
      throw error;
    }
  }

  async writeAll(rows) {
    const write = async () => {
      await mkdir(dirname(this.filePath), { recursive: true });
      const temporaryPath = join(dirname(this.filePath), `${randomUUID()}.tmp`);
      await writeFile(temporaryPath, `${JSON.stringify(rows, null, 2)}\n`, 'utf8');
      await rename(temporaryPath, this.filePath);
    };
    this.writeQueue = this.writeQueue.then(write, write);
    return this.writeQueue;
  }

  async create(record) {
    const rows = await this.readAll();
    const created = { id: randomUUID(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...record };
    rows.push(created);
    await this.writeAll(rows);
    return created;
  }

  async findById(id) { return (await this.readAll()).find((row) => row.id === id) ?? null; }

  async findOne(predicate) { return (await this.readAll()).find(predicate) ?? null; }

  async update(id, changes) {
    const rows = await this.readAll();
    const index = rows.findIndex((row) => row.id === id);
    if (index < 0) return null;
    rows[index] = { ...rows[index], ...changes, updatedAt: new Date().toISOString() };
    await this.writeAll(rows);
    return rows[index];
  }

  async delete(id) {
    const rows = await this.readAll();
    const index = rows.findIndex((row) => row.id === id);
    if (index < 0) return null;
    const [removed] = rows.splice(index, 1);
    await this.writeAll(rows);
    return removed;
  }
}

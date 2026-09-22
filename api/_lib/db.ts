import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import seedData from '../../data/db.json';

export interface StoredUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: string;
  avatarUrl?: string;
  resetToken?: string;
  resetTokenExpires?: number;
}

export interface StoredBatchAllocation {
  batchId: string;
  batchNumber: string;
  expiryDate: string;
  quantity: number;
}

export interface StoredMedicine {
  id: string;
  userId: string;
  name: string;
  genericName?: string;
  category: string;
  dosageForm: string;
  strength?: string;
  unit?: string;
  minStockLevel: number;
  description?: string;
  status: 'Active' | 'Discontinued' | 'Inactive';
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StoredBatch {
  id: string;
  userId: string;
  medicineId: string;
  medicine_id?: string;
  medicineName: string;
  batchNumber: string;
  quantity: number;
  initialQuantity: number;
  manufacturingDate?: string;
  expiryDate: string;
  supplierId: string;
  supplier_id?: string;
  supplierName: string;
  purchasePrice?: number;
  sellingPrice?: number;
  createdAt: string;
}

export interface StoredSupplier {
  id: string;
  userId: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  leadTimeDays: number;
  createdAt: string;
}

export interface StoredDispensingRecord {
  id: string;
  userId: string;
  medicineId: string;
  medicineName: string;
  quantity: number;
  batchAllocations: StoredBatchAllocation[];
  patientName?: string;
  prescriptionNumber?: string;
  prescribedBy?: string;
  notes?: string;
  dispensedAt: string;
  unitPrice?: number;
  totalAmount?: number;
}

export interface DatabaseSchema {
  users: StoredUser[];
  sessions: { token: string; userId: string; createdAt: number; expiresAt: number }[];
  medicines: StoredMedicine[];
  batches: StoredBatch[];
  suppliers: StoredSupplier[];
  dispensingRecords: StoredDispensingRecord[];
}

const IS_SERVERLESS = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const BASE_DATA_DIR = path.join(process.cwd(), 'data');
export const DATA_DIR = IS_SERVERLESS ? path.join('/tmp', 'pharmavault_data') : BASE_DATA_DIR;
export const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
export const DB_FILE = path.join(DATA_DIR, 'db.json');

function initFileSystem() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }
    if (!fs.existsSync(DB_FILE)) {
      try {
        fs.writeFileSync(DB_FILE, JSON.stringify(seedData, null, 2), 'utf-8');
      } catch (writeErr) {
        console.warn('Could not write initial db to disk:', writeErr);
      }
    }
  } catch (err) {
    console.warn('Filesystem notice:', err);
  }
}

initFileSystem();

export function loadDatabase(): DatabaseSchema {
  initFileSystem();
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      return {
        users: Array.isArray(parsed.users) ? parsed.users : ((seedData as any).users || []),
        sessions: Array.isArray(parsed.sessions) ? parsed.sessions : ((seedData as any).sessions || []),
        medicines: Array.isArray(parsed.medicines) ? parsed.medicines : ((seedData as any).medicines || []),
        batches: Array.isArray(parsed.batches) ? parsed.batches : ((seedData as any).batches || []),
        suppliers: Array.isArray(parsed.suppliers) ? parsed.suppliers : ((seedData as any).suppliers || []),
        dispensingRecords: Array.isArray(parsed.dispensingRecords) ? parsed.dispensingRecords : ((seedData as any).dispensingRecords || []),
      };
    }
  } catch (err) {
    console.error('Error reading db.json, using bundled seed data:', err);
  }
  return {
    users: Array.isArray((seedData as any).users) ? (seedData as any).users : [],
    sessions: Array.isArray((seedData as any).sessions) ? (seedData as any).sessions : [],
    medicines: Array.isArray((seedData as any).medicines) ? (seedData as any).medicines : [],
    batches: Array.isArray((seedData as any).batches) ? (seedData as any).batches : [],
    suppliers: Array.isArray((seedData as any).suppliers) ? (seedData as any).suppliers : [],
    dispensingRecords: Array.isArray((seedData as any).dispensingRecords) ? (seedData as any).dispensingRecords : [],
  };
}

export function saveDatabase(db: DatabaseSchema): void {
  initFileSystem();
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving db.json:', err);
  }
}

export function setCORS(res: any): void {
  if (typeof res.setHeader === 'function') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  }
}

export function sendJson(res: any, status: number, data: any): void {
  setCORS(res);
  res.statusCode = status;
  if (typeof res.setHeader === 'function') {
    res.setHeader('Content-Type', 'application/json');
  }
  if (typeof res.status === 'function' && typeof res.json === 'function') {
    res.status(status).json(data);
    return;
  }
  res.end(JSON.stringify(data));
}

export async function parseBody(req: any): Promise<any> {
  if (req.body && typeof req.body === 'object') {
    return req.body;
  }
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (chunk: any) => {
      raw += chunk;
    });
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}

export function getAuthenticatedUser(req: any, db: DatabaseSchema): StoredUser | null {
  const headers = req.headers || {};
  const authHeader = headers.authorization || headers.Authorization;
  if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.split(' ')[1];
  const session = db.sessions.find((s) => s.token === token && s.expiresAt > Date.now());
  if (!session) return null;
  return db.users.find((u) => u.id === session.userId) || null;
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function comparePassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

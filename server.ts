import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

// High body limit for image uploads (e.g. 15MB)
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Directories for local file persistence & uploads
const DATA_DIR = path.join(process.cwd(), 'data');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const DB_FILE = path.join(DATA_DIR, 'db.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Ensure db.json structure
interface StoredUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: string;
  avatarUrl?: string;
  resetToken?: string;
  resetTokenExpires?: number;
}

interface StoredBatchAllocation {
  batchId: string;
  batchNumber: string;
  expiryDate: string;
  quantity: number;
}

interface StoredMedicine {
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

interface StoredBatch {
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

interface StoredSupplier {
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

interface StoredDispensingRecord {
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

interface DatabaseSchema {
  users: StoredUser[];
  sessions: { token: string; userId: string; createdAt: number; expiresAt: number }[];
  medicines: StoredMedicine[];
  batches: StoredBatch[];
  suppliers: StoredSupplier[];
  dispensingRecords: StoredDispensingRecord[];
}

function loadDatabase(): DatabaseSchema {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      return {
        users: Array.isArray(parsed.users) ? parsed.users : [],
        sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
        medicines: Array.isArray(parsed.medicines) ? parsed.medicines : [],
        batches: Array.isArray(parsed.batches) ? parsed.batches : [],
        suppliers: Array.isArray(parsed.suppliers) ? parsed.suppliers : [],
        dispensingRecords: Array.isArray(parsed.dispensingRecords) ? parsed.dispensingRecords : [],
      };
    }
  } catch (err) {
    console.error('Error reading db.json:', err);
  }
  return {
    users: [],
    sessions: [],
    medicines: [],
    batches: [],
    suppliers: [],
    dispensingRecords: [],
  };
}

function saveDatabase(db: DatabaseSchema) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving db.json:', err);
  }
}

// Serve uploaded medicine images statically
app.use('/uploads', express.static(UPLOADS_DIR));

// -------------------------------------------------------------
// Authentication Middleware
// -------------------------------------------------------------
interface AuthenticatedRequest extends Request {
  user?: StoredUser;
}

function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: Missing or invalid token.' });
    return;
  }

  const token = authHeader.split(' ')[1];
  const db = loadDatabase();
  const session = db.sessions.find((s) => s.token === token && s.expiresAt > Date.now());

  if (!session) {
    res.status(401).json({ error: 'Unauthorized: Session expired or invalid.' });
    return;
  }

  const user = db.users.find((u) => u.id === session.userId);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized: User not found.' });
    return;
  }

  req.user = user;
  next();
}

// -------------------------------------------------------------
// Auth Endpoints
// -------------------------------------------------------------

// Register
app.post('/api/auth/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      res.status(400).json({ error: 'Full name must be at least 2 characters.' });
      return;
    }

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      res.status(400).json({ error: 'A valid email address is required.' });
      return;
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters.' });
      return;
    }

    const cleanEmail = email.toLowerCase().trim();
    const db = loadDatabase();

    if (db.users.some((u) => u.email === cleanEmail)) {
      res.status(409).json({ error: 'An account with this email already exists.' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const newUser: StoredUser = {
      id: `usr_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      name: name.trim(),
      email: cleanEmail,
      passwordHash,
      createdAt: new Date().toISOString(),
    };

    db.users.push(newUser);

    // Create session (30 days validity)
    const token = crypto.randomBytes(32).toString('hex');
    const session = {
      token,
      userId: newUser.id,
      createdAt: Date.now(),
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
    };
    db.sessions.push(session);
    saveDatabase(db);

    res.status(201).json({
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        createdAt: newUser.createdAt,
        avatarUrl: newUser.avatarUrl,
      },
      token,
    });
  } catch (error: any) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Internal server error during registration.' });
  }
});

// Login
app.post('/api/auth/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    const cleanEmail = String(email).toLowerCase().trim();
    const db = loadDatabase();
    const user = db.users.find((u) => u.email === cleanEmail);

    if (!user) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    // Create session
    const token = crypto.randomBytes(32).toString('hex');
    const session = {
      token,
      userId: user.id,
      createdAt: Date.now(),
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
    };
    db.sessions.push(session);
    saveDatabase(db);

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
        avatarUrl: user.avatarUrl,
      },
      token,
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error during login.' });
  }
});

// Logout
app.post('/api/auth/logout', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];
    if (token) {
      const db = loadDatabase();
      db.sessions = db.sessions.filter((s) => s.token !== token);
      saveDatabase(db);
    }
    res.json({ success: true, message: 'Logged out successfully.' });
  } catch (error: any) {
    res.status(500).json({ error: 'Logout failed.' });
  }
});

// Get Current User (/me)
app.get('/api/auth/me', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const user = req.user!;
  res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
      avatarUrl: user.avatarUrl,
    },
  });
});

// Request Password Reset Token
app.post('/api/auth/forgot-password', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ error: 'Email is required.' });
      return;
    }

    const cleanEmail = String(email).toLowerCase().trim();
    const db = loadDatabase();
    const userIndex = db.users.findIndex((u) => u.email === cleanEmail);

    if (userIndex === -1) {
      // Don't leak user existence; return standard confirmation
      res.json({
        success: true,
        message: 'If an account exists with this email, a reset code has been issued.',
      });
      return;
    }

    // Generate a 6-digit verification code or token
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    db.users[userIndex].resetToken = resetCode;
    db.users[userIndex].resetTokenExpires = Date.now() + 15 * 60 * 1000; // 15 mins
    saveDatabase(db);

    res.json({
      success: true,
      message: 'Password reset code generated.',
      // For developer/demonstration testing in sandbox, provide the code in response
      devResetCode: resetCode,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to process forgot password.' });
  }
});

// Reset Password with Token/Code
app.post('/api/auth/reset-password', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, resetCode, newPassword } = req.body;
    if (!email || !resetCode || !newPassword) {
      res.status(400).json({ error: 'Email, reset code, and new password are required.' });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters.' });
      return;
    }

    const cleanEmail = String(email).toLowerCase().trim();
    const db = loadDatabase();
    const user = db.users.find((u) => u.email === cleanEmail);

    if (
      !user ||
      !user.resetToken ||
      user.resetToken !== resetCode.trim() ||
      !user.resetTokenExpires ||
      user.resetTokenExpires < Date.now()
    ) {
      res.status(400).json({ error: 'Invalid or expired password reset code.' });
      return;
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    delete user.resetToken;
    delete user.resetTokenExpires;

    // Invalidate prior sessions
    db.sessions = db.sessions.filter((s) => s.userId !== user.id);
    saveDatabase(db);

    res.json({ success: true, message: 'Password has been reset successfully. Please log in.' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to reset password.' });
  }
});

// -------------------------------------------------------------
// Image Upload Endpoint (Stores persistently in data/uploads)
// -------------------------------------------------------------
app.post('/api/upload/image', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const { imageBase64, filename } = req.body;
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      res.status(400).json({ error: 'Missing imageBase64 data.' });
      return;
    }

    // Match data URI header e.g. data:image/png;base64,...
    const matches = imageBase64.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
    if (!matches) {
      res.status(400).json({ error: 'Invalid image data format. Must be base64 data URI.' });
      return;
    }

    const ext = matches[1].toLowerCase() === 'jpeg' ? 'jpg' : matches[1].toLowerCase();
    if (!['png', 'jpg', 'jpeg', 'webp'].includes(ext)) {
      res.status(400).json({ error: 'Supported image formats are JPG, JPEG, PNG, and WebP.' });
      return;
    }

    const buffer = Buffer.from(matches[2], 'base64');
    // Check file size (max 8MB)
    if (buffer.length > 8 * 1024 * 1024) {
      res.status(400).json({ error: 'Image size exceeds maximum allowed size (8MB).' });
      return;
    }

    const uniqueId = `img_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const safeExt = ext.replace(/[^a-z0-9]/gi, '');
    const outFilename = `${uniqueId}.${safeExt}`;
    const filePath = path.join(UPLOADS_DIR, outFilename);

    fs.writeFileSync(filePath, buffer);

    const publicUrl = `/uploads/${outFilename}`;
    res.json({
      url: publicUrl,
      filename: outFilename,
      size: buffer.length,
    });
  } catch (error: any) {
    console.error('Image upload error:', error);
    res.status(500).json({ error: 'Failed to upload image.' });
  }
});

// -------------------------------------------------------------
// Data Endpoints - Strictly Scoped to Authenticated User
// -------------------------------------------------------------

// GET all inventory data for current user
app.get('/api/inventory', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.user!.id;
  const db = loadDatabase();

  const userMedicines = db.medicines.filter((m) => m.userId === userId);
  const userBatches = db.batches.filter((b) => b.userId === userId);
  const userSuppliers = db.suppliers.filter((s) => s.userId === userId);
  const userDispensing = db.dispensingRecords.filter((d) => d.userId === userId);

  res.json({
    medicines: userMedicines,
    batches: userBatches,
    suppliers: userSuppliers,
    dispensingRecords: userDispensing,
    isDemoData: false,
  });
});

// SYNC / Batch save all inventory data for current user
app.post('/api/inventory/sync', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.user!.id;
  const { medicines, batches, suppliers, dispensingRecords } = req.body;

  const db = loadDatabase();

  // Remove existing records for this user
  db.medicines = db.medicines.filter((m) => m.userId !== userId);
  db.batches = db.batches.filter((b) => b.userId !== userId);
  db.suppliers = db.suppliers.filter((s) => s.userId !== userId);
  db.dispensingRecords = db.dispensingRecords.filter((d) => d.userId !== userId);

  // Re-insert with strict userId enforcement
  if (Array.isArray(medicines)) {
    medicines.forEach((m: any) => {
      db.medicines.push({
        ...m,
        userId,
      });
    });
  }

  if (Array.isArray(batches)) {
    batches.forEach((b: any) => {
      db.batches.push({
        ...b,
        userId,
      });
    });
  }

  if (Array.isArray(suppliers)) {
    suppliers.forEach((s: any) => {
      db.suppliers.push({
        ...s,
        userId,
      });
    });
  }

  if (Array.isArray(dispensingRecords)) {
    dispensingRecords.forEach((d: any) => {
      db.dispensingRecords.push({
        ...d,
        userId,
      });
    });
  }

  saveDatabase(db);
  res.json({ success: true, message: 'Inventory saved successfully.' });
});

// Single Medicine CRUD
app.post('/api/medicines', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.user!.id;
  const medicine = req.body;

  if (!medicine.name || !medicine.category || !medicine.dosageForm) {
    res.status(400).json({ error: 'Missing required medicine fields.' });
    return;
  }

  const db = loadDatabase();
  const existingIdx = db.medicines.findIndex((m) => m.id === medicine.id && m.userId === userId);

  const cleanMed: StoredMedicine = {
    ...medicine,
    userId,
    updatedAt: new Date().toISOString(),
    createdAt: medicine.createdAt || new Date().toISOString(),
  };

  if (existingIdx >= 0) {
    db.medicines[existingIdx] = cleanMed;
  } else {
    db.medicines.unshift(cleanMed);
  }

  saveDatabase(db);
  res.json({ medicine: cleanMed });
});

app.delete('/api/medicines/:id', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.user!.id;
  const { id } = req.params;

  const db = loadDatabase();
  db.medicines = db.medicines.filter((m) => !(m.id === id && m.userId === userId));
  // Cascade delete batches for this medicine
  db.batches = db.batches.filter((b) => !(b.medicineId === id && b.userId === userId));

  saveDatabase(db);
  res.json({ success: true, message: 'Medicine and associated batches deleted.' });
});

// Batches CRUD
app.post('/api/batches', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.user!.id;
  const batch = req.body;
  const resolvedMedicineId = batch.medicineId || batch.medicine_id;
  const resolvedSupplierId = batch.supplierId || batch.supplier_id || '';

  if (!resolvedMedicineId || !batch.batchNumber || !batch.expiryDate || batch.quantity === undefined) {
    res.status(400).json({ error: 'Missing required batch fields.' });
    return;
  }

  const db = loadDatabase();
  const cleanBatch: StoredBatch = {
    ...batch,
    userId,
    medicineId: resolvedMedicineId,
    medicine_id: resolvedMedicineId,
    supplierId: resolvedSupplierId,
    supplier_id: resolvedSupplierId,
    createdAt: batch.createdAt || new Date().toISOString(),
  };

  const existingIdx = db.batches.findIndex((b) => b.id === batch.id && b.userId === userId);
  if (existingIdx >= 0) {
    db.batches[existingIdx] = cleanBatch;
  } else {
    db.batches.unshift(cleanBatch);
  }

  saveDatabase(db);
  res.json({ batch: cleanBatch });
});

app.delete('/api/batches/:id', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.user!.id;
  const { id } = req.params;

  const db = loadDatabase();
  db.batches = db.batches.filter((b) => !(b.id === id && b.userId === userId));
  saveDatabase(db);
  res.json({ success: true, message: 'Batch deleted.' });
});

// Suppliers CRUD
app.post('/api/suppliers', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.user!.id;
  const supplier = req.body;

  if (!supplier.name) {
    res.status(400).json({ error: 'Supplier name is required.' });
    return;
  }

  const db = loadDatabase();
  const cleanSupplier: StoredSupplier = {
    ...supplier,
    userId,
    createdAt: supplier.createdAt || new Date().toISOString(),
  };

  const existingIdx = db.suppliers.findIndex((s) => s.id === supplier.id && s.userId === userId);
  if (existingIdx >= 0) {
    db.suppliers[existingIdx] = cleanSupplier;
  } else {
    db.suppliers.unshift(cleanSupplier);
  }

  saveDatabase(db);
  res.json({ supplier: cleanSupplier });
});

app.delete('/api/suppliers/:id', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.user!.id;
  const { id } = req.params;

  const db = loadDatabase();
  db.suppliers = db.suppliers.filter((s) => !(s.id === id && s.userId === userId));
  saveDatabase(db);
  res.json({ success: true, message: 'Supplier deleted.' });
});

// Dispense transaction record with FEFO deduction
app.post('/api/dispense', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.user!.id;
  const { record, updatedBatches } = req.body;

  if (!record || !record.medicineId || !record.quantity) {
    res.status(400).json({ error: 'Invalid dispensing record.' });
    return;
  }

  const db = loadDatabase();

  // Save dispensing record
  const cleanRecord: StoredDispensingRecord = {
    ...record,
    userId,
    dispensedAt: record.dispensedAt || new Date().toISOString(),
  };
  db.dispensingRecords.unshift(cleanRecord);

  // Update batch quantities
  if (Array.isArray(updatedBatches)) {
    updatedBatches.forEach((ub: StoredBatch) => {
      const idx = db.batches.findIndex((b) => b.id === ub.id && b.userId === userId);
      if (idx >= 0) {
        db.batches[idx].quantity = ub.quantity;
      }
    });
  }

  saveDatabase(db);
  res.json({ success: true, record: cleanRecord });
});

// -------------------------------------------------------------
// Vite Middleware / Static Asset Serving
// -------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`PharmaVault server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();

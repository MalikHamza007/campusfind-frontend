/** Typed models — mirror backend/docs/API_CONTRACT.md. */
export type Role = 'student' | 'admin' | 'super_admin';
export type ReportType = 'lost' | 'found';
export type Category = 'id_card' | 'electronics' | 'calculator' | 'book' | 'keys' | 'wallet' | 'clothing' | 'other';
export type ItemStatus = 'open' | 'claim_pending' | 'matched' | 'returned' | 'closed';
export type ClaimStatus = 'pending' | 'approved' | 'rejected' | 'withdrawn' | 'returned';
export type FilePurpose = 'item_image' | 'claim_evidence' | 'avatar';

export interface User {
  id: string;
  fullName: string;
  email: string;
  studentId: string;
  department: string;
  phone: string | null;
  role: Role;
  status: 'active' | 'inactive';
  avatarFileId: string | null;
  avatar?: SignedLink | null;
  lastLoginAt: string | null;
  createdAt: string;
  version: number;
  reportCount?: number;
  claimCount?: number;
}

export interface SignedLink { url: string; expiresAt: string }
export interface ItemImage extends SignedLink { id: string }

export interface Item {
  id: string;
  code: string;
  reportType: ReportType;
  title: string;
  category: Category;
  description: string;
  eventDate: string;
  locationName: string;
  coordinates: { lat: number; lng: number };
  status: ItemStatus;
  distinctiveFeatures: string | null;
  color: string | null;
  brand: string | null;
  imageFileIds: string[];
  imageCount: number;
  images: ItemImage[];
  reporter: { id: string | null; fullName?: string; email?: string; studentId?: string; department?: string | null };
  isMine: boolean;
  returnedAt: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface ItemSummary {
  id: string;
  code?: string;
  title?: string;
  category?: Category;
  status?: ItemStatus;
  locationName?: string;
  eventDate?: string;
  reportType?: ReportType;
  description?: string;
  imageFileIds?: string[];
}

export interface EvidenceFile extends SignedLink { id: string; originalName: string; mimeType: string; size: number }

export interface Claim {
  id: string;
  foundItem: ItemSummary | null;
  lostItem: ItemSummary | null;
  claimant: { id: string; fullName?: string; email?: string; studentId?: string; department?: string } | null;
  ownershipEvidence: string;
  evidenceFileIds: string[];
  evidence: EvidenceFile[];
  status: ClaimStatus;
  adminNote: string | null;
  reviewedBy: { id: string; fullName?: string } | null;
  /** Staff member handling the claim — visible to the student. */
  assignedTo: { id: string; fullName: string; department?: string } | null;
  assignedAt: string | null;
  reviewedAt: string | null;
  returnedAt: string | null;
  withdrawnAt: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface StoredFile {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  sha256: string;
  purpose: FilePurpose;
  uploadedBy: string | { id: string; fullName: string };
  createdAt: string;
  inUse?: boolean;
  usedBy?: { type: 'item' | 'claim' | 'user'; id: string | null; label: string } | null;
  url?: string;
  expiresAt?: string;
}

export interface AuditEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata?: Record<string, unknown>;
  ip?: string;
  actor: { id: string; fullName: string; email?: string; role: Role } | null;
  createdAt: string;
}

export interface Paginated<T> { data: T[]; page: number; limit: number; total: number; totalPages: number }

export interface ApiErrorBody { error: { code: string; message: string; details?: { field: string; message: string }[] | unknown } }

export interface GeoPlace { name: string; displayName: string; lat: number; lng: number; type: string; insideCampus: boolean; source: 'landmark' | 'nominatim' }
export interface GeoResult<T> { data: T; source: 'live' | 'cache' | 'stale-cache' | 'fallback'; warning?: string }
export interface MapConfig { university: string; center: { lat: number; lng: number }; bounds: { minLat: number; minLng: number; maxLat: number; maxLng: number }; landmarks: { name: string; lat: number; lng: number; type: string }[] }

export interface Kpi { value: number; trend?: number[] }
export interface AdminStats {
  role: 'admin';
  kpis: Record<'totalLost' | 'totalFound' | 'openItems' | 'pendingClaims' | 'matchedItems' | 'returnedItems' | 'recoveryRate', Kpi>;
  charts: {
    lostVsFoundByCategory: { category: Category; lost: number; found: number }[];
    reportsAndReturns: { period: string; reports: number; returns: number }[];
    byStatus: { status: ItemStatus; count: number }[];
    byLocation: { location: string; count: number }[];
    funnel: { stage: string; count: number }[];
  };
  tables: { pendingQueue: Claim[]; recentlyReturned: Item[]; newestReports: Item[]; activity: AuditEntry[] };
  health: {
    db: string;
    storage: { driver: string; objects: number; bytes: number; files: number };
    externalApi: { name: string; live: number; cache: number; stale: number; fallback: number; lastError: string | null; lastErrorAt: string | null };
    users: { active: number; total: number };
    uptimeSeconds: number;
  };
}
export interface StudentStats {
  role: 'student';
  kpis: Record<'myLostReports' | 'myFoundReports' | 'myPendingClaims' | 'myReturnedItems' | 'campusOpenItems', Kpi>;
  charts: {
    myReportsByType: { type: ReportType; count: number }[];
    campusOpenByCategory: { category: Category; count: number }[];
    myReportsTimeline: { period: string; count: number }[];
    campusByLocation: { location: string; count: number }[];
  };
  tables: { myRecentReports: Item[]; myClaims: Claim[]; campusRecent: Item[]; activity: AuditEntry[] };
}
export type DashboardStats = AdminStats | StudentStats;

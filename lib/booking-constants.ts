/**
 * Trạng thái đặt phòng được đồng bộ trên toàn ứng dụng
 */
export const BOOKING_STATUSES = {
  WAITING_FOR_CONFIRMATION: 'Chờ xác nhận',
  CONFIRMED: 'Đã xác nhận',
  ARRIVED: 'Đã đến',
  USING: 'Đang dùng',
  WAITING_TO_ARRIVE: 'Chờ đến',
  WAITING_FOR_PAYMENT: 'Chờ thanh toán',
  PAID: 'Đã thanh toán',
  CANCELLED: 'Đã hủy',
} as const;

export type BookingStatus = typeof BOOKING_STATUSES[keyof typeof BOOKING_STATUSES];

// Danh sách tất cả các trạng thái
export const ALL_BOOKING_STATUSES = Object.values(BOOKING_STATUSES);

// Ánh xạ trạng thái cũ sang trạng thái mới để kompatibility
export const STATUS_MIGRATION_MAP: Record<string, BookingStatus> = {
  'Chưa xác nhận': BOOKING_STATUSES.WAITING_FOR_CONFIRMATION,
  'Chờ xác nhận': BOOKING_STATUSES.WAITING_FOR_CONFIRMATION,
  'Đã xác nhận': BOOKING_STATUSES.CONFIRMED,
  'Confirmed': BOOKING_STATUSES.CONFIRMED,
  'Đã đến': BOOKING_STATUSES.ARRIVED,
  'Arrived': BOOKING_STATUSES.ARRIVED,
  'Đang dùng': BOOKING_STATUSES.USING,
  'Đang diễn ra': BOOKING_STATUSES.USING,
  'Using': BOOKING_STATUSES.USING,
  'Ongoing': BOOKING_STATUSES.USING,
  'Chờ đến': BOOKING_STATUSES.WAITING_TO_ARRIVE,
  'Waiting to arrive': BOOKING_STATUSES.WAITING_TO_ARRIVE,
  'Chờ thanh toán': BOOKING_STATUSES.WAITING_FOR_PAYMENT,
  'Waiting for payment': BOOKING_STATUSES.WAITING_FOR_PAYMENT,
  'Đã thanh toán': BOOKING_STATUSES.PAID,
  'Đã hoàn thành': BOOKING_STATUSES.PAID,
  'Paid': BOOKING_STATUSES.PAID,
  'Completed': BOOKING_STATUSES.PAID,
  'Đã hủy': BOOKING_STATUSES.CANCELLED,
  'Đã huỷ': BOOKING_STATUSES.CANCELLED,
  'Cancelled': BOOKING_STATUSES.CANCELLED,
};

// Ánh xạ màu sắc cho mỗi trạng thái
export const STATUS_COLORS: Record<BookingStatus, string> = {
  [BOOKING_STATUSES.WAITING_FOR_CONFIRMATION]: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  [BOOKING_STATUSES.CONFIRMED]: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  [BOOKING_STATUSES.ARRIVED]: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  [BOOKING_STATUSES.USING]: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  [BOOKING_STATUSES.WAITING_TO_ARRIVE]: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  [BOOKING_STATUSES.WAITING_FOR_PAYMENT]: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  [BOOKING_STATUSES.PAID]: 'bg-green-500/20 text-green-400 border-green-500/30',
  [BOOKING_STATUSES.CANCELLED]: 'bg-red-500/20 text-red-400 border-red-500/30',
};

// Ánh xạ icon/emoji cho mỗi trạng thái
export const STATUS_EMOJIS: Record<BookingStatus, string> = {
  [BOOKING_STATUSES.WAITING_FOR_CONFIRMATION]: '⏳',
  [BOOKING_STATUSES.CONFIRMED]: '✓',
  [BOOKING_STATUSES.ARRIVED]: '📍',
  [BOOKING_STATUSES.USING]: '▶',
  [BOOKING_STATUSES.WAITING_TO_ARRIVE]: '⏱',
  [BOOKING_STATUSES.WAITING_FOR_PAYMENT]: '💳',
  [BOOKING_STATUSES.PAID]: '✔',
  [BOOKING_STATUSES.CANCELLED]: '✕',
};

/**
 * Chuẩn hóa trạng thái từ các định dạng khác nhau thành trạng thái chuẩn
 */
export function normalizeBookingStatus(status: any): BookingStatus {
  if (!status) return BOOKING_STATUSES.WAITING_FOR_CONFIRMATION;
  
  const statusStr = String(status).trim();
  
  // Tìm trong bản đồ migration
  const normalized = STATUS_MIGRATION_MAP[statusStr];
  if (normalized) return normalized;
  
  // Tìm case-insensitive
  const lowerStatus = statusStr.toLowerCase();
  for (const [key, value] of Object.entries(STATUS_MIGRATION_MAP)) {
    if (key.toLowerCase() === lowerStatus) {
      return value;
    }
  }
  
  // Mặc định
  return BOOKING_STATUSES.WAITING_FOR_CONFIRMATION;
}

/**
 * Lấy màu sắc cho trạng thái
 */
export function getStatusColor(status: any): string {
  const normalized = normalizeBookingStatus(status);
  return STATUS_COLORS[normalized];
}

/**
 * Lấy emoji cho trạng thái
 */
export function getStatusEmoji(status: any): string {
  const normalized = normalizeBookingStatus(status);
  return STATUS_EMOJIS[normalized];
}

/**
 * Lấy nhãn hiển thị cho trạng thái (bao gồm emoji)
 */
export function getStatusLabel(status: any): string {
  const normalized = normalizeBookingStatus(status);
  const emoji = STATUS_EMOJIS[normalized];
  return `${emoji} ${normalized}`;
}

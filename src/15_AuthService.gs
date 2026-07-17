const AuthService = Object.freeze({
  login(p, client) {
    p = requireObject_(p);
    const username = requireNonBlank_(p.username, 'username').toLowerCase();
    const u = UserRepository.findOne({ username });
    if (!u || u.status !== APP_STATUSES.ACTIVE || !Security.verify(p.password, u.salt, u.passwordHash)) throw new AppError('INVALID_CREDENTIALS', 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
    const token = Security.token(), exp = new Date(Date.now() + APP_CONFIG.security.sessionHours * 3600000);
    const s = SessionRepository.insert({ tokenHash: Utils.sha(token), userId: u.userId, expiresAt: exp.toISOString(), lastSeenAt: Utils.now(), deviceJson: client || {}, revoked: false }, { actorId: u.userId });
    UserRepository.update(u.userId, { lastLoginAt: Utils.now() }, { actorId: u.userId });
    return { token, expiresAt: exp.toISOString(), user: cleanUser_(u), sessionId: s.sessionId };
  },
  context(token) {
    if (!token) throw new AppError('INVALID_SESSION', 'กรุณาเข้าสู่ระบบ');
    const s = SessionRepository.findOne({ tokenHash: Utils.sha(token) });
    if (!s || Utils.bool(s.revoked) || new Date(s.expiresAt) <= new Date()) throw new AppError('INVALID_SESSION', 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่');
    const u = UserRepository.findById(s.userId);
    if (!u || u.status !== APP_STATUSES.ACTIVE) throw new AppError('INVALID_SESSION', 'บัญชีนี้ไม่พร้อมใช้งาน');
    SessionRepository.update(s.sessionId, { lastSeenAt: Utils.now() }, { actorId: u.userId });
    return { requestId: Utils.id('REQ'), sessionId: s.sessionId, userId: u.userId, role: u.role, permissions: Utils.arr(u.permissionsJson) };
  },
  changePassword(c, p) {
    p = requireObject_(p);
    const u = UserRepository.findById(c.userId);
    if (!Security.verify(p.currentPassword, u.salt, u.passwordHash)) throw new AppError('INVALID_CREDENTIALS', 'รหัสผ่านปัจจุบันไม่ถูกต้อง');
    const next = requireNonBlank_(p.newPassword, 'รหัสผ่านใหม่');
    if (next.length < 12) throw AppError.validation('รหัสผ่านใหม่ต้องมีอย่างน้อย 12 ตัวอักษร');
    if (String(p.currentPassword) === next) throw AppError.validation('รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสผ่านเดิม');
    const h = Security.hash(next);
    UserRepository.update(u.userId, { passwordHash: h.hash, salt: h.salt, mustChangePassword: false }, { actorId: u.userId });
    return { changed: true };
  },
  logout(c) { return SessionRepository.update(c.sessionId, { revoked: true }, { actorId: c.userId }); }
});

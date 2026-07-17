const LMSStudioEnterprise = Object.freeze({
  info() { return { name: APP_CONFIG.app.name, version: Props.get('APP_VERSION', APP_CONFIG.app.version), environment: APP_CONFIG.app.environment, schoolName: Props.get('SCHOOL_NAME', 'โรงเรียนของฉัน'), spreadsheetId: Props.get('LMS_SPREADSHEET_ID', ''), rootFolderId: Props.get('LMS_ROOT_FOLDER_ID', ''), installedAt: Props.get('INSTALLED_AT', ''), serverTime: Utils.now() }; },
  install(c, p) {
    p = Object.assign({ schoolName: 'โรงเรียนของฉัน', schoolCode: 'SCHOOL', adminName: 'ผู้ดูแลระบบ', adminEmail: '', adminUsername: 'admin', adminPassword: '', installJobs: true }, p || {});
    if (String(p.adminPassword).length < 12) throw AppError.validation('รหัสผ่านผู้ดูแลต้องมีอย่างน้อย 12 ตัวอักษร');
    Props.secret('LMS_SESSION_SECRET'); Props.secret('LMS_SYSTEM_API_KEY');
    Props.set('SCHOOL_NAME', p.schoolName); Props.set('SCHOOL_CODE', p.schoolCode); Props.set('APP_VERSION', APP_CONFIG.app.version);
    StorageService.root(); DB.ss(); BootstrapService.installOrUpgrade(); BootstrapService.seed(c);
    if (!UserRepository.findOne({ username: String(p.adminUsername).toLowerCase() })) UserService.create(c, { username: p.adminUsername, password: p.adminPassword, email: p.adminEmail, displayName: p.adminName, role: APP_ROLES.SYSTEM_ADMIN, permissions: ['*'], mustChangePassword: true });
    if (p.installJobs) SchedulerService.installDefaults(c);
    Props.set('INSTALLED_AT', Utils.now()); Props.set('INSTALL_KEY', '');
    return { installed: true, info: this.info(), diagnostics: checkLMSStudioEnterprise() };
  }
});

function installLMSStudioEnterprise(installKey) {
  const expected = Props.required('INSTALL_KEY');
  if (!installKey || !Security.verify(String(installKey), 'INSTALL', Utils.sha('INSTALL:' + expected))) throw AppError.permission('INSTALL_KEY ไม่ถูกต้อง');
  return LMSStudioEnterprise.install(systemContext_('INSTALL'), {
    schoolName: Props.get('SETUP_SCHOOL_NAME', 'โรงเรียนของฉัน'), schoolCode: Props.get('SETUP_SCHOOL_CODE', 'SCHOOL'),
    adminName: Props.get('SETUP_ADMIN_NAME', 'ผู้ดูแลระบบ'), adminEmail: Props.get('SETUP_ADMIN_EMAIL', ''),
    adminUsername: Props.get('SETUP_ADMIN_USERNAME', 'admin'), adminPassword: Props.required('SETUP_ADMIN_PASSWORD'), installJobs: true
  });
}

// Private Apps Script editor entry point. Functions ending in _ are not exposed to google.script.run.
function setupLMSStudioEnterprise_() {
  return installLMSStudioEnterprise(Props.required('INSTALL_KEY'));
}

// Recovery entry point for the Apps Script editor. Never expose this without the trailing _.
function resetAdminPassword_() {
  const username = Props.get('SETUP_ADMIN_USERNAME', 'admin').trim().toLowerCase();
  const password = Props.required('SETUP_ADMIN_PASSWORD');
  if (password.length < 12) throw AppError.validation('รหัสผ่านผู้ดูแลต้องมีอย่างน้อย 12 ตัวอักษร');
  const user = UserRepository.findOne({ username: username });
  if (!user) throw AppError.notFound('ไม่พบบัญชีผู้ดูแล กรุณารัน setupLMSStudioEnterprise_ ก่อน');
  if (user.role !== APP_ROLES.SYSTEM_ADMIN) throw AppError.permission('บัญชีนี้ไม่ใช่ผู้ดูแลระบบ');
  const h = Security.hash(password);
  UserRepository.update(user.userId, {
    passwordHash: h.hash,
    salt: h.salt,
    status: APP_STATUSES.ACTIVE,
    mustChangePassword: true
  }, { actorId: 'PASSWORD_RECOVERY' });
  SessionRepository.findMany({ userId: user.userId }).forEach(s => {
    if (!Utils.bool(s.revoked)) SessionRepository.update(s.sessionId, { revoked: true }, { actorId: 'PASSWORD_RECOVERY' });
  });
  Props.set('SETUP_ADMIN_PASSWORD', '');
  return { reset: true, username: username };
}

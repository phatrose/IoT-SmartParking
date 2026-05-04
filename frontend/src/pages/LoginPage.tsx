import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import styles from "./LoginPage.module.css";
import hcmutLogo from "../assets/hcmut.png";
import { useAuth } from "../contexts/AuthContext";

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.userIcon}>
      <path d="M12 12.2a4.2 4.2 0 1 0-4.2-4.2A4.2 4.2 0 0 0 12 12.2Zm0 2.1c-4.1 0-7.4 2.3-7.4 5.1v.8h14.8v-.8c0-2.8-3.3-5.1-7.4-5.1Z" />
    </svg>
  );
}

export default function LoginPage() {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const { login, clearSession } = useAuth();
  const [adminOpen, setAdminOpen] = useState(false);
  const [adminId, setAdminId] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminError, setAdminError] = useState("");
  const [adminLoading, setAdminLoading] = useState(false);

  const language = i18n.resolvedLanguage?.startsWith("vi") ? "vi" : "en";
  const copy =
    language === "vi"
      ? {
          loginHint: "Đăng nhập bằng tài khoản trên:",
          accountButton: "Tài khoản HCMUT (HCMUT account)",
          adminButton: "Quản trị viên",
          languageLabel: "Ngôn ngữ",
          cookiesButton: "Thông báo cookie",
          helpLabel: "Trợ giúp",
          modalTitle: "Đăng nhập Admin / Operator",
          hcmutIdLabel: "Mã HCMUT",
          passwordLabel: "Mật khẩu",
          submitButton: "Đăng nhập",
          cancelButton: "Hủy",
          loginLoading: "Đang đăng nhập...",
          adminRoleError:
            "Chỉ tài khoản Admin hoặc Operator mới được phép đăng nhập tại đây.",
          invalidCredentials: "Sai hcmutId hoặc mật khẩu.",
        }
      : {
          loginHint: "Log in using your account on:",
          accountButton: "HCMUT account",
          adminButton: "Admin",
          languageLabel: "Language",
          cookiesButton: "Cookies notice",
          helpLabel: "Help",
          modalTitle: "Admin / Operator Login",
          hcmutIdLabel: "HCMUT ID",
          passwordLabel: "Password",
          submitButton: "Sign in",
          cancelButton: "Cancel",
          loginLoading: "Signing in...",
          adminRoleError: "Only Admin or Operator accounts can sign in here.",
          invalidCredentials: "Invalid hcmutId or password.",
        };

  const openAdminModal = () => {
    setAdminOpen(true);
    setAdminError("");
  };

  const closeAdminModal = () => {
    if (adminLoading) return;
    setAdminOpen(false);
    setAdminError("");
  };

  const handleAdminSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setAdminError("");
    setAdminLoading(true);
    try {
      const user = await login(adminId, adminPassword);
      if (user.role !== "ADMIN" && user.role !== "OPERATOR") {
        clearSession();
        setAdminError(copy.adminRoleError);
        return;
      }
      navigate("/");
    } catch (err: any) {
      setAdminError(err?.response?.data?.message || copy.invalidCredentials);
    } finally {
      setAdminLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <main className={styles.card}>
        <div className={styles.logoBlock}>
          <img src={hcmutLogo} alt="HCMUT" className={styles.logo} />
          <div className={styles.divider} />
          <p className={styles.loginHint}>{copy.loginHint}</p>
        </div>

        <button
          type="button"
          className={styles.accountButton}
          onClick={() => navigate("/cas")}
        >
          <UserIcon />
          <span>{copy.accountButton}</span>
        </button>

        <button
          type="button"
          className={styles.adminButton}
          onClick={openAdminModal}
        >
          {copy.adminButton}
        </button>

        <div className={styles.divider} />

        <div className={styles.footerRow}>
          <select
            className={styles.languageSelect}
            value={language}
            onChange={(event) => i18n.changeLanguage(event.target.value)}
            aria-label={copy.languageLabel}
          >
            <option value="en">English (en)</option>
            <option value="vi">Tiếng Việt (vi)</option>
          </select>

          <button type="button" className={styles.cookiesButton}>
            {copy.cookiesButton}
          </button>
        </div>
      </main>

      <button
        type="button"
        className={styles.floatingHelp}
        aria-label={copy.helpLabel}
      >
        ?
      </button>

      {adminOpen && (
        <div className={styles.modalOverlay} onClick={closeAdminModal}>
          <div
            className={styles.modal}
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>{copy.modalTitle}</h2>
              <button
                type="button"
                className={styles.closeButton}
                onClick={closeAdminModal}
              >
                ✕
              </button>
            </div>

            <form className={styles.modalBody} onSubmit={handleAdminSubmit}>
              <label className={styles.modalLabel} htmlFor="admin-hcmut-id">
                {copy.hcmutIdLabel}
              </label>
              <input
                id="admin-hcmut-id"
                className={styles.modalInput}
                value={adminId}
                onChange={(event) => setAdminId(event.target.value)}
                required
              />

              <label className={styles.modalLabel} htmlFor="admin-password">
                {copy.passwordLabel}
              </label>
              <input
                id="admin-password"
                type="password"
                className={styles.modalInput}
                value={adminPassword}
                onChange={(event) => setAdminPassword(event.target.value)}
                required
              />

              {adminError && (
                <div className={styles.modalError}>{adminError}</div>
              )}

              <div className={styles.modalActions}>
                <button
                  type="submit"
                  className={styles.submitButton}
                  disabled={adminLoading}
                >
                  {adminLoading ? copy.loginLoading : copy.submitButton}
                </button>
                <button
                  type="button"
                  className={styles.cancelButton}
                  onClick={closeAdminModal}
                >
                  {copy.cancelButton}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

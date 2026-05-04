import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import styles from "./CasLoginPage.module.css";
import hcmutLogo from "../assets/hcmut.png";
import { useAuth } from "../contexts/AuthContext";

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.userIcon}>
      <path d="M12 3.8a4.4 4.4 0 1 0 4.4 4.4A4.41 4.41 0 0 0 12 3.8Zm0 10.3c-4.9 0-8.9 2.9-8.9 6.5V22h17.8v-1.4c0-3.6-4-6.5-8.9-6.5Z" />
    </svg>
  );
}

export default function CasLoginPage() {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [warnOtherSites, setWarnOtherSites] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const language = i18n.resolvedLanguage?.startsWith("vi") ? "vi" : "en";
  const copy =
    language === "vi"
      ? {
          headerTitle: "Dịch vụ xác thực tập trung",
          title: "Nhập tên người dùng và mật khẩu",
          usernameLabel: "Tên đăng nhập",
          passwordLabel: "Mật khẩu",
          warnOtherSites:
            "Cảnh báo tôi trước khi đăng nhập vào các trang web khác.",
          changePassword: "Đổi mật khẩu?",
          languages: "Ngôn ngữ",
          noteTitle: "Lưu ý",
          note1:
            "Dịch vụ xác thực tập trung này cung cấp đăng nhập một lần cho các dịch vụ HCMUT, giúp bạn chuyển giữa các hệ thống mà không cần đăng nhập lại nhiều lần.",
          note2:
            "Sau khi xác thực, trình duyệt có thể được chuyển hướng tới các ứng dụng tin cậy dùng chung nhà cung cấp danh tính của trường.",
          note3:
            "Nếu dùng máy tính dùng chung, hãy đăng xuất khỏi ứng dụng sau khi hoàn tất phiên làm việc.",
          supportTitle: "Hỗ trợ kỹ thuật",
          footer: "Bản quyền © HCMUT. Mọi quyền được bảo lưu.",
          clearButton: "Xóa",
          loginButton: "Đăng nhập",
          loginLoading: "Đang đăng nhập...",
          invalidCredentials: "Sai thông tin đăng nhập.",
          languageSelected: "Đang chọn: Tiếng Việt",
        }
      : {
          headerTitle: "Central Authentication Service",
          title: "Enter your Username and Password",
          usernameLabel: "Username",
          passwordLabel: "Password",
          warnOtherSites: "Warn me before logging me into other sites.",
          changePassword: "Change password?",
          languages: "Languages",
          noteTitle: "Please note",
          note1:
            "This Central Authentication Service provides single sign-on for HCMUT services so you can move between systems without logging in repeatedly.",
          note2:
            "After authentication, the browser can be redirected to trusted applications that share the same campus identity provider.",
          note3:
            "If you share a device, make sure you sign out from the application when you finish your session.",
          supportTitle: "Technical support",
          footer: "Copyright © HCMUT. All rights reserved.",
          clearButton: "Clear",
          loginButton: "Login",
          loginLoading: "Logging in...",
          invalidCredentials: "Invalid credentials.",
          languageSelected: "Selected: English",
        };

  const clearForm = () => {
    setUsername("");
    setPassword("");
    setWarnOtherSites(true);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(username, password);
      navigate("/");
    } catch (err: any) {
      setError(err?.response?.data?.message || copy.invalidCredentials);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <img src={hcmutLogo} alt="HCMUT" className={styles.headerLogo} />
        <h1 className={styles.headerTitle}>{copy.headerTitle}</h1>
      </header>

      <main className={styles.body}>
        <section className={styles.formPanel}>
          <h2 className={styles.formTitle}>{copy.title}</h2>
          <form onSubmit={handleSubmit}>
            <div className={styles.fieldGroup}>
              <label className={styles.label} htmlFor="cas-username">
                {copy.usernameLabel}
              </label>
              <input
                id="cas-username"
                className={styles.input}
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                required
              />
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label} htmlFor="cas-password">
                {copy.passwordLabel}
              </label>
              <input
                id="cas-password"
                type="password"
                className={styles.input}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>

            <label className={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={warnOtherSites}
                onChange={(event) => setWarnOtherSites(event.target.checked)}
              />
              <span>{copy.warnOtherSites}</span>
            </label>

            {error && <div className={styles.error}>{error}</div>}

            <div className={styles.buttonRow}>
              <button
                type="submit"
                className={styles.loginButton}
                disabled={loading}
              >
                {loading ? copy.loginLoading : copy.loginButton}
              </button>
              <button
                type="button"
                className={styles.clearButton}
                onClick={clearForm}
                disabled={loading}
              >
                {copy.clearButton}
              </button>
            </div>

            <a
              href="#"
              className={styles.changePasswordLink}
              onClick={(event) => event.preventDefault()}
            >
              {copy.changePassword}
            </a>
          </form>
        </section>

        <aside className={styles.infoPanel}>
          <section className={styles.infoSection}>
            <h3 className={styles.infoHeading}>{copy.languages}</h3>
            <div className={styles.languageLinks}>
              <button
                type="button"
                className={styles.languageButton}
                onClick={() => i18n.changeLanguage("vi")}
              >
                Tiếng Việt
              </button>
              <span className={styles.languageSeparator}>|</span>
              <button
                type="button"
                className={styles.languageButton}
                onClick={() => i18n.changeLanguage("en")}
              >
                English
              </button>
            </div>
            <div className={styles.languageValue}>{copy.languageSelected}</div>
          </section>

          <section className={styles.infoSection}>
            <h3 className={styles.infoHeading}>{copy.noteTitle}</h3>
            <p>{copy.note1}</p>
            <p>{copy.note2}</p>
            <p>{copy.note3}</p>
          </section>

          <section className={styles.infoSection}>
            <h3 className={styles.infoHeading}>{copy.supportTitle}</h3>
            <p>Email: support@hcmut.edu.vn</p>
            <p>Phone: (028) 3865 4183</p>
          </section>
        </aside>
      </main>

      <footer className={styles.footer}>
        <span>{copy.footer}</span>
        <a
          href="#"
          className={styles.footerLink}
          onClick={(event) => event.preventDefault()}
        >
          Jasig CAS 3.5.1
        </a>
      </footer>
    </div>
  );
}

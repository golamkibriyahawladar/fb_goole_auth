"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";

interface NavItem {
  id: string;
  label: string;
  icon: string;
  href: string;
}

const FB_TABS: NavItem[] = [
  { id: "messages", label: "Messages", icon: "💬", href: "/dashboard/messages" },
  { id: "comments", label: "Comments", icon: "🗨️", href: "/dashboard/comments" },
  { id: "posts", label: "Posts", icon: "📝", href: "/dashboard/posts" },
  { id: "ads", label: "Ads", icon: "📊", href: "/dashboard/ads" },
];

const GOOGLE_TABS: NavItem[] = [
  { id: "gmail", label: "Gmail", icon: "📧", href: "/dashboard/gmail" },
  { id: "google-ads", label: "Google Ads", icon: "📈", href: "/dashboard/google-ads" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === "unauthenticated") router.push("/");
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="dash-layout" style={{ alignItems: "center", justifyContent: "center" }}>
        <div className="loading-center">
          <div className="spinner" />
          <span>Loading dashboard...</span>
        </div>
      </div>
    );
  }

  const provider = session?.provider || "facebook";
  const tabs = provider === "google" ? GOOGLE_TABS : FB_TABS;
  const providerLabel = provider === "google" ? "Google" : "Facebook";
  const providerColor = provider === "google" ? "#ea4335" : "#1877f2";
  const userName = session?.user?.name || "User";
  const userImage = session?.user?.image;

  return (
    <div className="dash-layout">
      {/* Sidebar */}
      <aside className="dash-sidebar">
        <div className="dash-sidebar-logo">
          <div className="dash-sidebar-logo-icon">⚡</div>
          <span className="dash-sidebar-logo-name">SocialHub</span>
        </div>

        {/* Provider badge */}
        <div style={{ padding: "0 .5rem" }}>
          <span className={`provider-badge ${provider}`}>
            {provider === "facebook" ? (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
            ) : (
              <span>G</span>
            )}
            {providerLabel}
          </span>
        </div>

        <nav className="dash-nav">
          <div className="dash-nav-section-label">Navigation</div>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              id={`nav-${tab.id}`}
              className={`dash-nav-item ${pathname === tab.href || pathname.startsWith(tab.href + "/") ? "active" : ""}`}
              onClick={() => router.push(tab.href)}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>

        {/* User block */}
        <div>
          <div className="dash-user-block">
            <div className="dash-user-avatar">
              {userImage ? (
                <img src={userImage} alt={userName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                userName[0]?.toUpperCase()
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="dash-user-name" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {userName}
              </div>
              <div className="dash-user-role">{providerLabel} User</div>
            </div>
          </div>
          <button
            id="btn-logout"
            className="dash-logout"
            onClick={() => signOut({ callbackUrl: "/" })}
            style={{ marginTop: ".5rem" }}
          >
            <span>🚪</span>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="dash-main">
        {/* Top tabs bar */}
        <div className="dash-topbar">
          <div className="dash-tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                className={`dash-tab ${pathname === tab.href || pathname.startsWith(tab.href + "/") ? "active" : ""}`}
                onClick={() => router.push(tab.href)}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="dash-content">{children}</div>
      </div>
    </div>
  );
}

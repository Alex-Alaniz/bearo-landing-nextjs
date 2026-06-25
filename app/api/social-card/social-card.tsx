interface SocialCardProps {
  eyebrow: string;
  title: string;
  body: string;
  badges: string[];
  footer: string;
}

export function SocialCard({
  eyebrow,
  title,
  body,
  badges,
  footer,
}: SocialCardProps) {
  return (
    <div
      style={{
        width: "1200px",
        height: "630px",
        display: "flex",
        background: "#020202",
        color: "#eeeeee",
        fontFamily: "Arial, Helvetica, sans-serif",
        padding: "54px",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: "36px",
          border: "1px solid rgba(255,255,255,0.14)",
          display: "flex",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: "36px",
          top: "36px",
          bottom: "36px",
          width: "10px",
          background: "#fe6a00",
          display: "flex",
        }}
      />
      <div
        style={{
          position: "absolute",
          right: "54px",
          top: "54px",
          width: "300px",
          height: "300px",
          border: "1px solid rgba(254,106,0,0.52)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "rgba(254,106,0,0.9)",
          fontSize: 82,
          fontWeight: 800,
        }}
      >
        $B
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: "790px",
          height: "100%",
          paddingLeft: "34px",
          zIndex: 1,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              color: "#fe6a00",
              fontSize: 24,
              fontWeight: 700,
              letterSpacing: 0,
              textTransform: "uppercase",
              marginBottom: "26px",
            }}
          >
            {eyebrow}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 104,
              lineHeight: 0.88,
              fontWeight: 900,
              letterSpacing: 0,
              maxWidth: "760px",
            }}
          >
            {title}
          </div>
          <div
            style={{
              display: "flex",
              color: "rgba(238,238,238,0.72)",
              fontSize: 34,
              lineHeight: 1.18,
              marginTop: "30px",
              maxWidth: "760px",
            }}
          >
            {body}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "16px",
          }}
        >
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            {badges.map((badge) => (
              <div
                key={badge}
                style={{
                  display: "flex",
                  border: "1px solid rgba(255,255,255,0.16)",
                  background: "rgba(255,255,255,0.045)",
                  color: "#eeeeee",
                  padding: "12px 14px",
                  fontSize: 20,
                  fontWeight: 700,
                  letterSpacing: 0,
                  textTransform: "uppercase",
                }}
              >
                {badge}
              </div>
            ))}
          </div>
          <div
            style={{
              display: "flex",
              color: "rgba(238,238,238,0.48)",
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: 0,
              textTransform: "uppercase",
              whiteSpace: "nowrap",
            }}
          >
            {footer}
          </div>
        </div>
      </div>
    </div>
  );
}

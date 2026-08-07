#!/usr/bin/env bash
# Install LibreSprite CLI and expose it as `aseprite` for aseprite-mcp.
# Idempotent: safe to re-run during Cloud Agent environment builds.
set -euo pipefail

# Avoid polluted LD_LIBRARY_PATH breaking system curl during re-runs.
unset LD_LIBRARY_PATH || true

LIBRESPRITE_VERSION="${LIBRESPRITE_VERSION:-v1.1}"
LIBRESPRITE_URL="${LIBRESPRITE_URL:-https://github.com/LibreSprite/LibreSprite/releases/download/${LIBRESPRITE_VERSION}/libresprite-development-linux-x86_64.zip}"
INSTALL_ROOT="${ASEPRITE_INSTALL_ROOT:-${HOME}/.local/share/aseprite-mcp}"
BIN_DIR="${ASEPRITE_BIN_DIR:-${HOME}/.local/bin}"
APPIMAGE_NAME="LibreSprite-x86_64.AppImage"

mkdir -p "${INSTALL_ROOT}" "${BIN_DIR}"

MARKER="${INSTALL_ROOT}/.installed-${LIBRESPRITE_VERSION}"
if [[ ! -x "${INSTALL_ROOT}/squashfs-root/usr/bin/libresprite" || ! -f "${MARKER}" ]]; then
  TMP_DIR="$(mktemp -d)"
  trap 'rm -rf "${TMP_DIR}"' EXIT
  echo "[aseprite-mcp] Downloading LibreSprite ${LIBRESPRITE_VERSION}..."
  curl -fsSL -o "${TMP_DIR}/libresprite.zip" "${LIBRESPRITE_URL}"
  unzip -qo "${TMP_DIR}/libresprite.zip" -d "${TMP_DIR}"
  chmod +x "${TMP_DIR}/${APPIMAGE_NAME}"
  rm -rf "${INSTALL_ROOT}/squashfs-root"
  (
    cd "${TMP_DIR}"
    "./${APPIMAGE_NAME}" --appimage-extract >/dev/null
  )
  mv "${TMP_DIR}/squashfs-root" "${INSTALL_ROOT}/"
  touch "${MARKER}"
  echo "[aseprite-mcp] LibreSprite extracted to ${INSTALL_ROOT}"
else
  echo "[aseprite-mcp] LibreSprite already installed at ${INSTALL_ROOT}"
fi

WRAPPER="${BIN_DIR}/aseprite"
cat > "${WRAPPER}" <<EOF
#!/usr/bin/env bash
set -euo pipefail
ROOT="${INSTALL_ROOT}/squashfs-root"
export LD_LIBRARY_PATH="\${ROOT}/usr/lib:\${LD_LIBRARY_PATH:-}"
exec "\${ROOT}/usr/bin/libresprite" "\$@"
EOF
chmod +x "${WRAPPER}"

# Also expose libresprite name for clarity.
ln -sfn "${WRAPPER}" "${BIN_DIR}/libresprite"

# @iborymagic/aseprite-mcp resolves /usr/local/bin/aseprite by default.
if [[ -w /usr/local/bin ]] || command -v sudo >/dev/null 2>&1; then
  if ln -sfn "${WRAPPER}" /usr/local/bin/aseprite 2>/dev/null; then
    echo "[aseprite-mcp] Linked /usr/local/bin/aseprite"
  elif sudo ln -sfn "${WRAPPER}" /usr/local/bin/aseprite; then
    echo "[aseprite-mcp] Linked /usr/local/bin/aseprite (via sudo)"
  fi
fi

case ":${PATH}:" in
  *":${BIN_DIR}:"*) ;;
  *) export PATH="${BIN_DIR}:${PATH}" ;;
esac

# Persist PATH for interactive shells in Cloud Agent VMs.
PROFILE_SNIPPET='export PATH="$HOME/.local/bin:$PATH"'
for profile in "${HOME}/.bashrc" "${HOME}/.profile"; do
  if [[ -f "${profile}" ]] && ! grep -Fq 'HOME/.local/bin:$PATH' "${profile}"; then
    printf '\n# aseprite-mcp CLI\n%s\n' "${PROFILE_SNIPPET}" >> "${profile}"
  fi
done

echo "[aseprite-mcp] Wrapper ready: ${WRAPPER}"
"${WRAPPER}" --version
which aseprite || true
aseprite --version
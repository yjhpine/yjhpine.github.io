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
  cleanup() { rm -rf "${TMP_DIR}"; }
  trap cleanup EXIT
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
  trap - EXIT
  cleanup
  echo "[aseprite-mcp] LibreSprite extracted to ${INSTALL_ROOT}"
else
  echo "[aseprite-mcp] LibreSprite already installed at ${INSTALL_ROOT}"
fi

WRAPPER="${BIN_DIR}/aseprite"
ROOT_PATH="${INSTALL_ROOT}/squashfs-root"
cat > "${WRAPPER}" <<'WRAPPER'
#!/usr/bin/env bash
set -euo pipefail
ROOT="__ROOT__"
export LD_LIBRARY_PATH="${ROOT}/usr/lib:${LD_LIBRARY_PATH:-}"
# Headless Cloud Agent / CI: avoid SDL display init failures.
export SDL_VIDEODRIVER="${SDL_VIDEODRIVER:-dummy}"
if [[ -z "${XDG_RUNTIME_DIR:-}" ]]; then
  export XDG_RUNTIME_DIR="/tmp/runtime-${USER:-ubuntu}"
fi
mkdir -p "${XDG_RUNTIME_DIR}"
chmod 700 "${XDG_RUNTIME_DIR}" 2>/dev/null || true
exec "${ROOT}/usr/bin/libresprite" "$@"
WRAPPER
# Inject install path without nested heredoc expansion issues.
sed -i "s|__ROOT__|${ROOT_PATH}|g" "${WRAPPER}"
chmod +x "${WRAPPER}"

# Also expose libresprite name for clarity.
ln -sfn "${WRAPPER}" "${BIN_DIR}/libresprite"

# @iborymagic/aseprite-mcp resolves /usr/local/bin/aseprite by default.
if ln -sfn "${WRAPPER}" /usr/local/bin/aseprite 2>/dev/null; then
  echo "[aseprite-mcp] Linked /usr/local/bin/aseprite"
elif command -v sudo >/dev/null 2>&1 && sudo ln -sfn "${WRAPPER}" /usr/local/bin/aseprite; then
  echo "[aseprite-mcp] Linked /usr/local/bin/aseprite (via sudo)"
fi

case ":${PATH}:" in
  *":${BIN_DIR}:"*) ;;
  *) export PATH="${BIN_DIR}:${PATH}" ;;
esac

# Persist PATH for interactive shells in Cloud Agent VMs.
PROFILE_LINE='export PATH="$HOME/.local/bin:$PATH"'
for profile in "${HOME}/.bashrc" "${HOME}/.profile"; do
  if [[ -f "${profile}" ]] && ! grep -Fq 'HOME/.local/bin:$PATH' "${profile}"; then
    printf '\n# aseprite-mcp CLI\n%s\n' "${PROFILE_LINE}" >> "${profile}"
  fi
done

echo "[aseprite-mcp] Wrapper ready: ${WRAPPER}"
"${WRAPPER}" --version
command -v aseprite || true

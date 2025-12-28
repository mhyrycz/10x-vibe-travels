/**
 * Navigation utilities for client-side routing
 */

export function useNavigate() {
  return (path: string) => {
    window.location.href = path;
  };
}

"use client";

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  /** How many page pills to show (default 5) */
  siblingCount?: number;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  siblingCount = 1,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  /* ── page range builder ── */
  function range(start: number, end: number) {
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }

  function buildPages(): (number | "…")[] {
    const total = totalPages;
    const current = currentPage;
    const siblings = siblingCount;

    // Always show: first, last, current ± siblings, and ellipsis
    const leftSibling  = Math.max(current - siblings, 1);
    const rightSibling = Math.min(current + siblings, total);

    const showLeftDots  = leftSibling  > 2;
    const showRightDots = rightSibling < total - 1;

    if (!showLeftDots && !showRightDots) return range(1, total);

    if (!showLeftDots) {
      const left = range(1, rightSibling + 1);
      return [...left, "…", total];
    }

    if (!showRightDots) {
      const right = range(leftSibling - 1, total);
      return [1, "…", ...right];
    }

    return [1, "…", ...range(leftSibling, rightSibling), "…", total];
  }

  const pages = buildPages();
  const canPrev = currentPage > 1;
  const canNext = currentPage < totalPages;

  return (
    <>
      <style>{`
        .pgn-root {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          padding: 8px 0;
          user-select: none;
        }

        .pgn-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 36px;
          height: 36px;
          padding: 0 6px;
          border-radius: 8px;
          border: 1.5px solid transparent;
          background: transparent;
          color: var(--neutral-500, #6b7280);
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.18s ease, color 0.18s ease,
                      border-color 0.18s ease, transform 0.12s ease,
                      box-shadow 0.18s ease;
          position: relative;
          overflow: hidden;
        }

        .pgn-btn::after {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: inherit;
          background: radial-gradient(circle at center, rgba(220,38,38,0.18) 0%, transparent 70%);
          opacity: 0;
          transition: opacity 0.25s ease;
          pointer-events: none;
        }

        .pgn-btn:hover:not(:disabled)::after { opacity: 1; }

        .pgn-btn:hover:not(:disabled) {
          color: #dc2626;
          border-color: rgba(220,38,38,0.3);
          background: rgba(220,38,38,0.06);
          transform: translateY(-1px);
        }

        .pgn-btn:active:not(:disabled) {
          transform: translateY(0) scale(0.95);
        }

        .pgn-btn:disabled {
          opacity: 0.32;
          cursor: not-allowed;
        }

        .pgn-btn.active {
          background: #dc2626;
          color: #fff;
          border-color: #dc2626;
          box-shadow: 0 2px 12px rgba(220,38,38,0.35), 0 1px 3px rgba(220,38,38,0.25);
          font-weight: 700;
          transform: translateY(-1px);
        }

        .pgn-btn.active:hover { transform: translateY(-2px); box-shadow: 0 4px 16px rgba(220,38,38,0.4); }
        .pgn-btn.active::after { display: none; }

        .pgn-dots {
          display: inline-flex;
          align-items: flex-end;
          justify-content: center;
          min-width: 30px;
          height: 36px;
          padding-bottom: 6px;
          font-size: 14px;
          color: var(--neutral-400, #9ca3af);
          letter-spacing: 1px;
          pointer-events: none;
        }

        .pgn-nav {
          color: var(--neutral-400, #9ca3af);
        }

        /* Subtle entrance */
        @keyframes pgn-in {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .pgn-root { animation: pgn-in 0.3s ease both; }
      `}</style>

      <nav className="pgn-root" aria-label="Paginação">
        {/* First page */}
        <button
          className="pgn-btn pgn-nav"
          onClick={() => onPageChange(1)}
          disabled={!canPrev}
          title="Primeira página"
        >
          <ChevronsLeft size={15} />
        </button>

        {/* Prev */}
        <button
          className="pgn-btn pgn-nav"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={!canPrev}
          title="Página anterior"
        >
          <ChevronLeft size={15} />
        </button>

        {/* Pages */}
        {pages.map((p, i) =>
          p === "…" ? (
            <span key={`dots-${i}`} className="pgn-dots">···</span>
          ) : (
            <button
              key={p}
              className={`pgn-btn${p === currentPage ? " active" : ""}`}
              onClick={() => onPageChange(p as number)}
              aria-current={p === currentPage ? "page" : undefined}
            >
              {p}
            </button>
          )
        )}

        {/* Next */}
        <button
          className="pgn-btn pgn-nav"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!canNext}
          title="Próxima página"
        >
          <ChevronRight size={15} />
        </button>

        {/* Last page */}
        <button
          className="pgn-btn pgn-nav"
          onClick={() => onPageChange(totalPages)}
          disabled={!canNext}
          title="Última página"
        >
          <ChevronsRight size={15} />
        </button>
      </nav>
    </>
  );
}
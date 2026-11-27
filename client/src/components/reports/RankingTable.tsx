import type { ReactNode } from "react";

interface RankingTableProps {
  headers: string[];
  rows: ReactNode[][];
  emptyMessage: string;
}

export default function RankingTable({
  headers,
  rows,
  emptyMessage,
}: RankingTableProps) {
  if (rows.length === 0) {
    return <p className="text-muted small mb-0">{emptyMessage}</p>;
  }
  return (
    <table className="table table-hover align-middle mb-0">
      <thead>
        <tr>
          <th scope="col" className="small text-muted">
            #
          </th>
          {headers.map((header) => (
            <th scope="col" className="small text-muted" key={header}>
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((cells, index) => (
          <tr key={index}>
            <td className="text-muted">{index + 1}</td>
            {cells.map((cell, cellIndex) => (
              <td key={cellIndex}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
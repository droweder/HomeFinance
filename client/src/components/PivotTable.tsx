import React, { useState, useEffect } from 'react';
import * as WebDataRocksReact from '@webdatarocks/react-webdatarocks';
import { pivotTableApi } from '../lib/api';

const PivotTable: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const result = await pivotTableApi.getData();
        setData(result);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return <div className="p-4">Loading...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">Error: {error}</div>;
  }

  const report = {
    dataSource: {
      data: data,
    },
    slice: {
      rows: [{ uniqueName: "Categoria" }],
      columns: [{ uniqueName: "Data" }],
      measures: [{ uniqueName: "Valor", aggregation: "sum" }],
      filters: [{ uniqueName: "Tipo" }],
    },
    formats: [{
        name: "Valor",
        thousandsSeparator: ",",
        decimalSeparator: ".",
        decimalPlaces: 2,
        currencySymbol: "R$",
        currencySymbolAlign: "left"
    }]
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Análise Dinâmica</h1>
      <WebDataRocksReact.Pivot
        toolbar={true}
        report={report}
      />
    </div>
  );
};

export default PivotTable;

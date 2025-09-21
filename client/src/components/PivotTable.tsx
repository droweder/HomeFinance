import React, { useState, useEffect } from 'react';
import PivotTableUI from 'react-pivottable/PivotTableUI';
import 'react-pivottable/pivottable.css';
import TableRenderers from 'react-pivottable/TableRenderers';
import Plot from 'react-plotly.js';
import createPlotlyRenderers from 'react-pivottable/PlotlyRenderers';
import { pivotTableApi } from '../lib/api';

// create Plotly renderers via dependency injection
const PlotlyRenderers = createPlotlyRenderers(Plot);

const PivotTable: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [pivotState, setPivotState] = useState({});
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

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Análise Dinâmica</h1>
      <div className="w-full h-[calc(100vh-150px)] overflow-auto">
        <PivotTableUI
          data={data}
          onChange={(s: any) => setPivotState(s)}
          renderers={Object.assign({}, TableRenderers, PlotlyRenderers)}
          {...pivotState}
        />
      </div>
    </div>
  );
};

export default PivotTable;

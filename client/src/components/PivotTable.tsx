import React, { useState, useEffect } from 'react';
import {
  PivotViewComponent,
  Inject,
  GroupingBar,
  FieldList,
  CalculatedField,
  Toolbar,
  PDFExport,
  ExcelExport,
  ConditionalFormatting,
} from '@syncfusion/ej2-react-pivotview';
import { pivotTableApi } from '../lib/api';

const PivotTable: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  let pivotObj: PivotViewComponent | null = null;

  const toolbarOptions = [
    'New',
    'Save',
    'SaveAs',
    'Rename',
    'Remove',
    'Load',
    'Grid',
    'Chart',
    'Export',
    'SubTotal',
    'GrandTotal',
    'ConditionalFormatting',
    'FieldList',
  ];

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

  const dataSourceSettings = {
    dataSource: data,
    expandAll: false,
    rows: [{ name: 'Categoria' }],
    columns: [{ name: 'Data' }],
    values: [{ name: 'Valor' }],
    filters: [{ name: 'Tipo' }],
    formatSettings: [{ name: 'Valor', format: 'C2' }],
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Análise Dinâmica</h1>
      <PivotViewComponent
        ref={(d) => (pivotObj = d)}
        id="PivotView"
        dataSourceSettings={dataSourceSettings}
        width={'100%'}
        height={'600'}
        showGroupingBar={true}
        showFieldList={true}
        allowCalculatedField={true}
        allowPdfExport={true}
        allowExcelExport={true}
        showToolbar={true}
        allowConditionalFormatting={true}
        toolbar={toolbarOptions}
      >
        <Inject services={[
          GroupingBar,
          FieldList,
          CalculatedField,
          Toolbar,
          PDFExport,
          ExcelExport,
          ConditionalFormatting,
        ]} />
      </PivotViewComponent>
    </div>
  );
};

export default PivotTable;

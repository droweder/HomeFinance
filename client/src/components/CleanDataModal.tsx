import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from './ui/toast';

interface CleanDataModalProps {
  onClose: () => void;
}

const CleanDataModal: React.FC<CleanDataModalProps> = ({ onClose }) => {
  const [table, setTable] = useState('expenses');
  const [column, setColumn] = useState('description');
  const [groupedValues, setGroupedValues] = useState<any[]>([]);
  const [selectedValues, setSelectedValues] = useState<string[]>([]);
  const [newValue, setNewValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('');
  const [listKey, setListKey] = useState(0);
  const { showToast } = useToast();

  const fetchGroupedValues = async () => {
    if (!table || !column) return;

    setLoading(true);
    const { data, error } = await supabase.rpc('group_by_case_insensitive', {
      table_name: table,
      column_name: column,
    });


    if (error) {
      showToast({ title: 'Erro', description: 'Não foi possível buscar os dados.' });
      console.error(error);
    } else {
      setGroupedValues(data as any[]);
    }
    setLoading(false);
  };

  const handleReplace = async () => {
    if (selectedValues.length === 0 || !newValue) {
      showToast({
        title: 'Atenção',
        description: 'Selecione os valores e informe o novo valor.',
      });
      return;
    }

    setLoading(true);
    const { error } = await supabase.rpc('update_case_insensitive', {
      table_name: table,
      column_name: column,
      old_values: selectedValues,
      new_value: newValue,
    });

    if (error) {
      showToast({ title: 'Erro', description: 'Não foi possível atualizar os dados.' });
      console.error(error);
      setLoading(false);
    } else {
      showToast({ title: 'Sucesso', description: 'Dados atualizados com sucesso.' });
      await fetchGroupedValues();
      setSelectedValues([]);
      setNewValue('');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroupedValues();
  }, [table, column]);

  const filteredValues = groupedValues.filter(
    (item) =>
      typeof item.value === 'string' &&
      item.value.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 w-full max-w-2xl flex flex-col gap-4" onClick={(e) => e.stopPropagation()}>

        <div className="flex justify-between items-center pb-2 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold">Limpeza de Dados</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Tabela
            </label>
            <select
              value={table}
              onChange={(e) => setTable(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="expenses">Despesas</option>
              <option value="income">Receitas</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Coluna
            </label>
            <select
              value={column}
              onChange={(e) => setColumn(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="description">Descrição</option>
              <option value="location">Localização</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Filtrar
          </label>
          <input
            type="text"
            placeholder="Filtrar valores..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>

        <div className="flex flex-col gap-2 max-h-64 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-2">
          {loading ? (
            <p className="text-center p-4">Carregando...</p>
          ) : (
            filteredValues.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedValues.includes(item.value)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedValues([...selectedValues, item.value]);
                      } else {
                        setSelectedValues(
                          selectedValues.filter((v) => v !== item.value)
                        );
                      }
                    }}
                  />
                  <span className="dark:text-white">{item.value}</span>
                </label>
                <span className="text-sm text-gray-500 bg-gray-100 dark:bg-gray-600 px-2 py-1 rounded-full">{item.count}</span>
              </div>
            ))
          )}
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              onChange={(e) => {
                if (e.target.checked) {
                  setSelectedValues(filteredValues.map((v) => v.value));
                } else {
                  setSelectedValues([]);
                }
              }}
              checked={selectedValues.length > 0 && selectedValues.length === filteredValues.length}
            />
            Selecionar todos ({selectedValues.length})
          </label>
          <button
            onClick={() => setSelectedValues([])}
            className="text-sm text-blue-600 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={selectedValues.length === 0}
          >
            Limpar seleção
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-end gap-4 bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg">
          <div className="w-full">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Substituir selecionados por
            </label>
            <input
              type="text"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              placeholder="Novo valor"
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <button
            onClick={handleReplace}
            disabled={loading || selectedValues.length === 0 || !newValue}
            className="w-full sm:w-auto bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M12 3c-1.1 0-2 .9-2 2v6h4V5c0-1.1-.9-2-2-2z"/><path d="M16.2 7.8 20 12l-3.8 4.2"/><path d="M4 12h16"/><path d="M12 21c1.1 0 2-.9 2-2v-6h-4v6c0 1.1.9 2 2 2z"/><path d="M7.8 16.2 4 12l3.8-4.2"/></svg>
            Substituir
          </button>
        </div>
      </div>
    </div>
  );
};

export default CleanDataModal;
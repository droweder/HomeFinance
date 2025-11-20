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
    } else {
      showToast({ title: 'Sucesso', description: 'Dados atualizados com sucesso.' });
      fetchGroupedValues();
      setSelectedValues([]);
      setNewValue('');
      setListKey(prevKey => prevKey + 1);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchGroupedValues();
  }, [table, column]);

  const filteredValues = groupedValues.filter(
    (item) => item.value && item.value.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 w-full max-w-2xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Limpeza de Dados</h2>
          <div className="flex gap-4">
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
        </div>
        <div className="mb-4">
          <input
            type="text"
            placeholder="Filtrar..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>
        <div key={listKey} className="max-h-64 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-2 mb-4">
          {loading ? (
            <p>Carregando...</p>
          ) : (
            filteredValues.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-700">
                <div className="flex items-center">
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
                    className="mr-2"
                  />
                  <span className="dark:text-white">{item.value}</span>
                </div>
                <span className="text-sm text-gray-500">{item.count}</span>
              </div>
            ))
          )}
        </div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <input
              type="checkbox"
              onChange={(e) => {
                if (e.target.checked) {
                  setSelectedValues(filteredValues.map((v) => v.value));
                } else {
                  setSelectedValues([]);
                }
              }}
              className="mr-2"
            />
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Selecionar todos ({selectedValues.length})
            </label>
          </div>
          <button
            onClick={() => setSelectedValues([])}
            className="text-sm text-blue-600 hover:underline"
          >
            Limpar seleção
          </button>
        </div>
        <div className="flex items-center gap-4 mb-4">
          <input
            type="text"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            placeholder="Novo valor"
            className="w-full border border-곰 kor-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          />
          <button
            onClick={handleReplace}
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            Substituir
          </button>
        </div>

        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default CleanDataModal;
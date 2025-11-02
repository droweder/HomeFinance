
import React, { useState, useRef, useEffect } from 'react';

interface AutocompleteInputProps {
  suggestions: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const AutocompleteInput: React.FC<AutocompleteInputProps> = ({
  suggestions,
  value,
  onChange,
  placeholder,
  className,
}) => {
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const userInput = e.currentTarget.value;
    const filtered = suggestions.filter(
      suggestion =>
        suggestion.toLowerCase().indexOf(userInput.toLowerCase()) > -1
    );
    setFilteredSuggestions(filtered);
    setShowSuggestions(true);
    onChange(userInput);
  };

  const handleClick = (suggestion: string) => {
    setFilteredSuggestions([]);
    setShowSuggestions(false);
    onChange(suggestion);
  };

  const SuggestionsListComponent = () => {
    return filteredSuggestions.length ? (
      <ul className="absolute z-10 w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg mt-1 max-h-60 overflow-y-auto">
        {filteredSuggestions.map((suggestion, index) => {
          return (
            <li
              className="px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
              key={suggestion + index}
              onClick={() => handleClick(suggestion)}
            >
              {suggestion}
            </li>
          );
        })}
      </ul>
    ) : null;
  };

  return (
    <div className="relative" ref={inputRef}>
      <input
        type="text"
        onChange={handleChange}
        value={value}
        placeholder={placeholder}
        className={className}
        onFocus={() => setShowSuggestions(true)}
      />
      {showSuggestions && <SuggestionsListComponent />}
    </div>
  );
};

export default AutocompleteInput;

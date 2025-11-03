
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
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
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
    setActiveSuggestionIndex(0); // Reset active suggestion on change
    onChange(userInput);
  };

  const handleClick = (suggestion: string) => {
    setFilteredSuggestions([]);
    setShowSuggestions(false);
    onChange(suggestion);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // User pressed the enter key
    if (e.key === 'Enter') {
      e.preventDefault(); // Stop form submission
      if (filteredSuggestions.length > 0) {
        handleClick(filteredSuggestions[activeSuggestionIndex]);
      }
    }
    // User pressed the up arrow
    else if (e.key === 'ArrowUp') {
      if (activeSuggestionIndex === 0) {
        return;
      }
      setActiveSuggestionIndex(activeSuggestionIndex - 1);
    }
    // User pressed the down arrow
    else if (e.key === 'ArrowDown') {
      if (activeSuggestionIndex + 1 === filteredSuggestions.length) {
        return;
      }
      setActiveSuggestionIndex(activeSuggestionIndex + 1);
    }
    // User pressed the escape key
    else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const SuggestionsListComponent = () => {
    return filteredSuggestions.length ? (
      <ul className="absolute z-10 w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg mt-1 max-h-60 overflow-y-auto">
        {filteredSuggestions.map((suggestion, index) => {
          let className = "px-3 py-2 cursor-pointer";
          if (index === activeSuggestionIndex) {
            className += " bg-gray-100 dark:bg-gray-600";
          }
          return (
            <li
              className={className}
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
        onKeyDown={handleKeyDown}
        value={value}
        placeholder={placeholder}
        className={className}
        onFocus={() => setShowSuggestions(true)}
      />
      {showSuggestions && value && <SuggestionsListComponent />}
    </div>
  );
};

export default AutocompleteInput;

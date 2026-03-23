import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, X, User } from 'lucide-react';

interface Option {
    id: string | number;
    label: string;
    sublabel?: string;
    image?: string;
}

interface SearchableSelectProps {
    options: Option[];
    value: string | number;
    onChange: (id: string) => void;
    placeholder?: string;
    emptyMessage?: string;
    className?: string;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({
    options,
    value,
    onChange,
    placeholder = "Selecionar...",
    emptyMessage = "Nenhum resultado encontrado",
    className = ""
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const selectedOption = options.find(opt => opt.id.toString() === value.toString());

    const filteredOptions = options.filter(opt =>
        opt.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (opt.sublabel && opt.sublabel.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            {/* Trigger */}
            <div
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center justify-between px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm cursor-pointer hover:bg-gray-100 transition-all min-w-[200px]"
            >
                <div className="flex items-center gap-2 truncate">
                    {selectedOption ? (
                        <>
                            <div className="w-5 h-5 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 shrink-0">
                                <User size={12} />
                            </div>
                            <span className="truncate font-medium text-gray-700">{selectedOption.label}</span>
                        </>
                    ) : (
                        <span className="text-gray-400">{placeholder}</span>
                    )}
                </div>
                <ChevronDown size={16} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>

            {/* Dropdown Panel */}
            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* Search Input */}
                    <div className="p-2 border-b border-gray-100 bg-gray-50/50">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                            <input
                                ref={inputRef}
                                type="text"
                                placeholder="Pesquisar..."
                                className="w-full pl-9 pr-8 py-1.5 bg-white border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition-shadow"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                            />
                            {searchTerm && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSearchTerm('');
                                    }}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Options List */}
                    <div className="max-h-60 overflow-y-auto py-1 custom-scrollbar">
                        {filteredOptions.length > 0 ? (
                            <>
                                <div
                                    className="px-3 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider bg-gray-50/50"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    Resultados
                                </div>
                                {filteredOptions.map((opt) => (
                                    <div
                                        key={opt.id}
                                        onClick={() => {
                                            onChange(opt.id.toString());
                                            setIsOpen(false);
                                            setSearchTerm('');
                                        }}
                                        className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors ${value.toString() === opt.id.toString()
                                                ? 'bg-brand-50 text-brand-700'
                                                : 'hover:bg-gray-50 text-gray-600'
                                            }`}
                                    >
                                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 shrink-0">
                                            <User size={16} />
                                        </div>
                                        <div className="overflow-hidden">
                                            <p className="text-sm font-medium truncate">{opt.label}</p>
                                            {opt.sublabel && <p className="text-[10px] text-gray-400 truncate uppercase">{opt.sublabel}</p>}
                                        </div>
                                    </div>
                                ))}
                            </>
                        ) : (
                            <div className="px-4 py-8 text-center">
                                <p className="text-sm text-gray-400 italic">{emptyMessage}</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SearchableSelect;

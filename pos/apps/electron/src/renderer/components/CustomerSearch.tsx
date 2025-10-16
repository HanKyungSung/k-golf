import * as React from 'react';
import { Input, Label, Card } from './ui/primitives';
import type { Customer } from '../types/booking';

interface CustomerSearchProps {
  onSelectCustomer: (customer: Customer) => void;
  selectedCustomer?: Customer | null;
}

const mockCustomers: Customer[] = [
  {
    id: '1',
    name: 'John Smith',
    phone: '+15551234567',
    email: 'john.smith@email.com',
    totalVisits: 15,
    lastVisit: '2024-01-10',
    createdAt: '2023-06-15',
  },
  {
    id: '2',
    name: 'Sarah Johnson',
    phone: '+15559876543',
    email: 'sarah.j@email.com',
    totalVisits: 8,
    lastVisit: '2024-01-12',
    createdAt: '2023-08-20',
  },
  {
    id: '3',
    name: 'Mike Davis',
    phone: '+15555551234',
    email: 'mike.davis@email.com',
    totalVisits: 22,
    lastVisit: '2024-01-15',
    createdAt: '2023-03-10',
  },
  {
    id: '4',
    name: 'Emily Chen',
    phone: '+15554443333',
    email: 'emily.chen@email.com',
    totalVisits: 5,
    lastVisit: '2024-01-08',
    createdAt: '2023-11-05',
  },
];

export function CustomerSearch({ onSelectCustomer, selectedCustomer }: CustomerSearchProps) {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [searchResults, setSearchResults] = React.useState<Customer[]>([]);
  const [isSearching, setIsSearching] = React.useState(false);

  React.useEffect(() => {
    if (searchQuery.length >= 3) {
      setIsSearching(true);
      const timer = setTimeout(() => {
        const results = mockCustomers.filter((customer) => {
          const query = searchQuery.toLowerCase();
          const phoneDigits = customer.phone.replace(/\D/g, '');
          const searchDigits = searchQuery.replace(/\D/g, '');
          return (
            customer.name.toLowerCase().includes(query) ||
            customer.email?.toLowerCase().includes(query) ||
            phoneDigits.includes(searchDigits)
          );
        });
        setSearchResults(results);
        setIsSearching(false);
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const formatPhoneDisplay = (phone: string): string => {
    if (phone.startsWith('+1')) {
      const digits = phone.slice(2);
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    return phone;
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="customer-search">Search Customer</Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
          <Input
            id="customer-search"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, phone, or email..."
            className="pl-10"
          />
        </div>
      </div>

      {selectedCustomer && (
        <Card className="p-4 bg-amber-500/10 border-amber-500/20">
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-white truncate">{selectedCustomer.name}</p>
              <p className="text-sm text-slate-400">{formatPhoneDisplay(selectedCustomer.phone)}</p>
              {selectedCustomer.email && <p className="text-sm text-slate-400 truncate">{selectedCustomer.email}</p>}
              <p className="text-xs text-slate-500 mt-1">{selectedCustomer.totalVisits} visits • Last: {selectedCustomer.lastVisit}</p>
            </div>
          </div>
        </Card>
      )}

      {searchQuery.length >= 3 && searchResults.length > 0 && !selectedCustomer && (
        <div className="space-y-2">
          <p className="text-sm text-slate-400">{searchResults.length} results found</p>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {searchResults.map((customer) => (
              <div key={customer.id} onClick={() => onSelectCustomer(customer)}>
                <Card className="p-3 cursor-pointer hover:bg-slate-700/50 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white truncate">{customer.name}</p>
                      <p className="text-sm text-slate-400">{formatPhoneDisplay(customer.phone)}</p>
                      {customer.email && <p className="text-xs text-slate-500 truncate">{customer.email}</p>}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-slate-500">{customer.totalVisits} visits</p>
                    </div>
                  </div>
                </Card>
              </div>
            ))}
          </div>
        </div>
      )}

      {searchQuery.length >= 3 && searchResults.length === 0 && !isSearching && (
        <p className="text-sm text-slate-400 text-center py-4">No customers found</p>
      )}

      {isSearching && <p className="text-sm text-slate-400 text-center py-4">Searching...</p>}
    </div>
  );
}

# Phone Number & Country Code Handling

## Architecture Overview

### Storage Strategy: E.164 Format
All phone numbers are stored in the database using the **E.164 international standard**:
- Format: `+[CountryCode][SubscriberNumber]`
- Example (Canada): `+14165551234`
- Example (Korea): `+821012345678`

**Why E.164?**
- ✅ International standard
- ✅ Single field (no separate country code column)
- ✅ Works globally
- ✅ Easy to parse and validate

---

## Layer-by-Layer Implementation

### 1. Database Layer
**Schema:**
```prisma
model User {
  phone String @unique  // E.164 format: "+14165551234"
}
```

**No separate country code field** - it's embedded in the phone number.

### 2. Backend Layer (Phase 1.2)

**Default Country Code:**
Hardcoded in backend code (not in database):

```typescript
// backend/src/utils/phoneUtils.ts

const DEFAULT_COUNTRY_CODE = '+1'; // Canada

export function normalizePhone(
  input: string, 
  countryCode: string = DEFAULT_COUNTRY_CODE
): string {
  // Remove all non-digits except leading +
  let cleaned = input.replace(/[^\d+]/g, '');
  
  // If already has country code, return as is
  if (cleaned.startsWith('+')) {
    return cleaned;
  }
  
  // If starts with country code digits (e.g., "1416..."), add +
  if (cleaned.startsWith('1') && cleaned.length === 11) {
    return '+' + cleaned;
  }
  
  // Otherwise, prepend default country code
  return countryCode + cleaned;
}

export function formatPhoneDisplay(phone: string): string {
  // Parse E.164 and format for display
  // "+14165551234" -> "+1 416-555-1234"
  
  if (!phone.startsWith('+')) return phone;
  
  // Extract country code
  const match = phone.match(/^\+(\d{1,3})(\d+)$/);
  if (!match) return phone;
  
  const [, countryCode, number] = match;
  
  // Format based on country code
  if (countryCode === '1' && number.length === 10) {
    // North American format: +1 (416) 555-1234
    const area = number.slice(0, 3);
    const prefix = number.slice(3, 6);
    const line = number.slice(6);
    return `+${countryCode} ${area}-${prefix}-${line}`;
  }
  
  if (countryCode === '82' && number.length === 10) {
    // Korean format: +82 10-1234-5678
    const mobile = number.slice(0, 2);
    const part1 = number.slice(2, 6);
    const part2 = number.slice(6);
    return `+${countryCode} ${mobile}-${part1}-${part2}`;
  }
  
  // Generic format for other countries
  return `+${countryCode} ${number}`;
}

export function validatePhone(phone: string): boolean {
  // E.164 validation: + followed by 1-15 digits
  return /^\+\d{1,15}$/.test(phone);
}

// Country-specific validation
export function validateCanadianPhone(phone: string): boolean {
  // +1 followed by 10 digits
  return /^\+1\d{10}$/.test(phone);
}

export function validateKoreanPhone(phone: string): boolean {
  // +82 followed by 9-11 digits
  return /^\+82\d{9,11}$/.test(phone);
}
```

### 3. Frontend Layer (Phase 1.5)

**PhoneInput Component:**

```tsx
interface PhoneInputProps {
  value: string;
  onChange: (phone: string) => void;
  defaultCountryCode?: string;
  allowedCountries?: string[];
}

export function PhoneInput({
  value,
  onChange,
  defaultCountryCode = '+1',
  allowedCountries = ['+1', '+82', '+44', '+86']
}: PhoneInputProps) {
  const [countryCode, setCountryCode] = useState(defaultCountryCode);
  const [localNumber, setLocalNumber] = useState('');
  
  // Parse existing value
  useEffect(() => {
    if (value.startsWith('+')) {
      // Extract country code and local number
      const match = value.match(/^\+(\d{1,3})(\d+)$/);
      if (match) {
        setCountryCode('+' + match[1]);
        setLocalNumber(match[2]);
      }
    }
  }, [value]);
  
  // Format as user types
  const handleLocalNumberChange = (e: ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value.replace(/\D/g, ''); // Only digits
    setLocalNumber(input);
    
    // Emit normalized E.164 format
    const normalized = countryCode + input;
    onChange(normalized);
  };
  
  return (
    <div className="flex gap-2">
      {/* Country Code Dropdown */}
      <select
        value={countryCode}
        onChange={(e) => {
          setCountryCode(e.target.value);
          onChange(e.target.value + localNumber);
        }}
        className="w-24"
      >
        <option value="+1">🇨🇦 +1</option>
        <option value="+82">🇰🇷 +82</option>
        <option value="+44">🇬🇧 +44</option>
        <option value="+86">🇨🇳 +86</option>
      </select>
      
      {/* Local Number Input */}
      <input
        type="tel"
        value={formatLocalNumber(localNumber, countryCode)}
        onChange={handleLocalNumberChange}
        placeholder={getPlaceholder(countryCode)}
        className="flex-1"
      />
      
      {/* Validation Indicator */}
      {validatePhone(countryCode + localNumber) && (
        <span className="text-green-500">✓</span>
      )}
    </div>
  );
}

// Helper functions
function formatLocalNumber(number: string, countryCode: string): string {
  if (countryCode === '+1' && number.length >= 10) {
    // Format: (416) 555-1234
    return `(${number.slice(0,3)}) ${number.slice(3,6)}-${number.slice(6)}`;
  }
  if (countryCode === '+82' && number.length >= 9) {
    // Format: 10-1234-5678
    return `${number.slice(0,2)}-${number.slice(2,6)}-${number.slice(6)}`;
  }
  return number;
}

function getPlaceholder(countryCode: string): string {
  if (countryCode === '+1') return '(416) 555-1234';
  if (countryCode === '+82') return '10-1234-5678';
  return 'Phone number';
}
```

---

## User Experience Flows

### Flow 1: Admin Creating Booking (Walk-in Customer)
1. Admin opens booking modal
2. Admin selects "Walk-in" booking source
3. Admin enters customer phone:
   - Sees dropdown: `[🇨🇦 +1 ▼]` (defaults to Canada)
   - Types: `4165551234`
   - Component auto-formats: `(416) 555-1234`
4. On submit, backend receives: `+14165551234`
5. Backend validates and stores: `+14165551234`

### Flow 2: International Customer (Korean)
1. Admin clicks country dropdown
2. Selects `🇰🇷 +82`
3. Types: `1012345678`
4. Component formats: `10-1234-5678`
5. Backend receives: `+821012345678`

### Flow 3: User Searching by Phone
1. Admin searches for existing customer
2. Types in search: `416-555-1234` (with dashes)
3. Backend normalizes: `+14165551234`
4. Database lookup: `WHERE phone = '+14165551234'`
5. Returns matching user

---

## Configuration

### Backend Configuration
```typescript
// backend/src/config/phone.ts

export const PHONE_CONFIG = {
  defaultCountryCode: '+1',
  
  supportedCountries: [
    { code: '+1', name: 'Canada/USA', flag: '🇨🇦', format: '(###) ###-####' },
    { code: '+82', name: 'Korea', flag: '🇰🇷', format: '##-####-####' },
    { code: '+44', name: 'UK', flag: '🇬🇧', format: '#### ### ####' },
    { code: '+86', name: 'China', flag: '🇨🇳', format: '### #### ####' },
  ],
  
  // Validation patterns per country
  validationPatterns: {
    '+1': /^\+1\d{10}$/,
    '+82': /^\+82\d{9,11}$/,
    '+44': /^\+44\d{10}$/,
    '+86': /^\+86\d{11}$/,
  }
};
```

### Frontend Configuration
```typescript
// frontend/src/config/phone.ts

export const DEFAULT_COUNTRY_CODE = '+1'; // Canada

// Can be overridden by environment variable
export const COUNTRY_CODE = process.env.REACT_APP_DEFAULT_COUNTRY_CODE || '+1';
```

---

## Environment Variables (Optional)

If you want to make the default country code configurable per deployment:

```bash
# .env
DEFAULT_COUNTRY_CODE=+1  # Backend default

# .env (frontend)
REACT_APP_DEFAULT_COUNTRY_CODE=+1  # Frontend default
```

But this is **optional** - hardcoding `+1` in the code is simpler and recommended.

---

## API Request/Response Examples

### Creating a User (API)
**Request:**
```json
POST /api/users
{
  "name": "John Doe",
  "phone": "+14165551234",  // E.164 format
  "email": "john@example.com"
}
```

**Response:**
```json
{
  "id": "uuid-123",
  "name": "John Doe",
  "phone": "+14165551234",
  "phoneDisplay": "+1 416-555-1234",  // Formatted for UI
  "email": "john@example.com"
}
```

### Searching by Phone (API)
**Request:**
```
GET /api/users/lookup?phone=416-555-1234
```

**Backend normalizes to:**
```
+14165551234
```

**Response:**
```json
{
  "found": true,
  "user": {
    "id": "uuid-123",
    "name": "John Doe",
    "phone": "+14165551234",
    "phoneDisplay": "+1 416-555-1234"
  }
}
```

---

## Summary

### Where Country Code Lives:
- ❌ **NOT in database** (no separate field)
- ✅ **Embedded in phone number** (E.164 format)
- ✅ **Default in backend code** (`+1` hardcoded)
- ✅ **User selects in frontend** (dropdown)

### Data Flow:
```
User Input          Frontend              Backend             Database
---------           --------              -------             --------
"416-555-1234"  →   Normalize to      →   Validate        →   Store
(with +1 dropdown)  "+14165551234"        E.164 format        "+14165551234"
```

### Benefits:
- ✅ Simple schema (one field)
- ✅ International support (any country)
- ✅ User-friendly input (country dropdown)
- ✅ Flexible (change default in code, not DB)
- ✅ Standard format (E.164)

### When to Change Default Country:
Just update the constant in code:
```typescript
// backend/src/utils/phoneUtils.ts
const DEFAULT_COUNTRY_CODE = '+44'; // Change to UK
```

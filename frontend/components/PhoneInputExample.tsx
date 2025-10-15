/**
 * PhoneInput Component Usage Example
 * 
 * This file demonstrates how to use the PhoneInput component.
 * Copy these examples into your forms/components as needed.
 */

import React, { useState } from 'react';
import { PhoneInput } from '@/components/PhoneInput';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

export function PhoneInputExamples() {
  const [phone1, setPhone1] = useState('');
  const [phone2, setPhone2] = useState('');
  const [phone3, setPhone3] = useState('');

  const handleSearch = () => {
    console.log('Search clicked for phone:', phone2);
    // Implement your search logic here
    // e.g., call API: fetch(`/api/users/lookup?phone=${phone2}`)
  };

  return (
    <div className="container mx-auto p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">PhoneInput Component Examples</h1>
        <p className="text-muted-foreground mt-2">
          A phone input component with Canadian formatting and E.164 normalization
        </p>
      </div>

      {/* Example 1: Basic Usage */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Usage</CardTitle>
          <CardDescription>
            Simple phone input with validation indicator
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <PhoneInput
            value={phone1}
            onChange={setPhone1}
            placeholder="(416) 555-1234"
          />
          
          <div className="text-sm space-y-1">
            <p><strong>Display Value:</strong> {phone1 ? `(${phone1.replace(/\D/g, '').slice(1, 4)}) ${phone1.replace(/\D/g, '').slice(4, 7)}-${phone1.replace(/\D/g, '').slice(7, 11)}` : 'Empty'}</p>
            <p><strong>Normalized Value (E.164):</strong> {phone1 || 'Empty'}</p>
          </div>
        </CardContent>
      </Card>

      {/* Example 2: With Search Button */}
      <Card>
        <CardHeader>
          <CardTitle>With Search Button</CardTitle>
          <CardDescription>
            Phone input with integrated search button for customer lookup
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <PhoneInput
            value={phone2}
            onChange={setPhone2}
            onSearch={handleSearch}
            showSearchButton
            placeholder="Enter phone to search"
          />
          
          <div className="text-sm space-y-1">
            <p><strong>Normalized Value:</strong> {phone2 || 'Empty'}</p>
            <p className="text-muted-foreground">
              Press Enter or click search button to trigger search
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Example 3: With Error State */}
      <Card>
        <CardHeader>
          <CardTitle>With Error Message</CardTitle>
          <CardDescription>
            Phone input showing error state
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <PhoneInput
            value={phone3}
            onChange={setPhone3}
            error={phone3 && phone3.replace(/\D/g, '').length < 11 ? 'Phone number is required' : undefined}
            placeholder="(416) 555-1234"
          />
        </CardContent>
      </Card>

      {/* Example 4: Disabled State */}
      <Card>
        <CardHeader>
          <CardTitle>Disabled State</CardTitle>
          <CardDescription>
            Phone input in disabled state
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PhoneInput
            value="+14165551234"
            onChange={() => {}}
            disabled
          />
        </CardContent>
      </Card>

      {/* Example 5: Read-Only State */}
      <Card>
        <CardHeader>
          <CardTitle>Read-Only State</CardTitle>
          <CardDescription>
            Phone input in read-only state (for display only)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PhoneInput
            value="+14165551234"
            onChange={() => {}}
            readOnly
          />
        </CardContent>
      </Card>

      {/* Usage Code Examples */}
      <Card>
        <CardHeader>
          <CardTitle>Code Examples</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h3 className="font-semibold">Basic Usage:</h3>
            <pre className="bg-muted p-4 rounded-md overflow-x-auto text-sm">
              <code>{`import { PhoneInput } from '@/components/PhoneInput';

function MyForm() {
  const [phone, setPhone] = useState('');

  return (
    <PhoneInput
      value={phone}
      onChange={setPhone}
      placeholder="(416) 555-1234"
    />
  );
}`}</code>
            </pre>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold">With Search Button:</h3>
            <pre className="bg-muted p-4 rounded-md overflow-x-auto text-sm">
              <code>{`<PhoneInput
  value={phone}
  onChange={setPhone}
  onSearch={() => {
    // Trigger customer lookup API
    fetch(\`/api/users/lookup?phone=\${phone}\`)
      .then(res => res.json())
      .then(data => console.log(data));
  }}
  showSearchButton
  placeholder="Enter phone to search"
/>`}</code>
            </pre>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold">With Error Handling:</h3>
            <pre className="bg-muted p-4 rounded-md overflow-x-auto text-sm">
              <code>{`const [phone, setPhone] = useState('');
const [error, setError] = useState('');

const handleSubmit = () => {
  if (!phone) {
    setError('Phone number is required');
    return;
  }
  // Submit logic...
};

<PhoneInput
  value={phone}
  onChange={(value) => {
    setPhone(value);
    setError(''); // Clear error on change
  }}
  error={error}
/>`}</code>
            </pre>
          </div>
        </CardContent>
      </Card>

      {/* Component Props Reference */}
      <Card>
        <CardHeader>
          <CardTitle>Props Reference</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-4">Prop</th>
                <th className="text-left py-2 px-4">Type</th>
                <th className="text-left py-2 px-4">Default</th>
                <th className="text-left py-2 px-4">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              <tr>
                <td className="py-2 px-4 font-mono">value</td>
                <td className="py-2 px-4">string</td>
                <td className="py-2 px-4">-</td>
                <td className="py-2 px-4">E.164 normalized phone number</td>
              </tr>
              <tr>
                <td className="py-2 px-4 font-mono">onChange</td>
                <td className="py-2 px-4">(value: string) =&gt; void</td>
                <td className="py-2 px-4">-</td>
                <td className="py-2 px-4">Callback with normalized phone</td>
              </tr>
              <tr>
                <td className="py-2 px-4 font-mono">onSearch</td>
                <td className="py-2 px-4">() =&gt; void</td>
                <td className="py-2 px-4">undefined</td>
                <td className="py-2 px-4">Search button click handler</td>
              </tr>
              <tr>
                <td className="py-2 px-4 font-mono">placeholder</td>
                <td className="py-2 px-4">string</td>
                <td className="py-2 px-4">"(416) 555-1234"</td>
                <td className="py-2 px-4">Input placeholder text</td>
              </tr>
              <tr>
                <td className="py-2 px-4 font-mono">disabled</td>
                <td className="py-2 px-4">boolean</td>
                <td className="py-2 px-4">false</td>
                <td className="py-2 px-4">Disable input</td>
              </tr>
              <tr>
                <td className="py-2 px-4 font-mono">readOnly</td>
                <td className="py-2 px-4">boolean</td>
                <td className="py-2 px-4">false</td>
                <td className="py-2 px-4">Make input read-only</td>
              </tr>
              <tr>
                <td className="py-2 px-4 font-mono">error</td>
                <td className="py-2 px-4">string</td>
                <td className="py-2 px-4">undefined</td>
                <td className="py-2 px-4">Error message to display</td>
              </tr>
              <tr>
                <td className="py-2 px-4 font-mono">showValidation</td>
                <td className="py-2 px-4">boolean</td>
                <td className="py-2 px-4">true</td>
                <td className="py-2 px-4">Show checkmark/X indicator</td>
              </tr>
              <tr>
                <td className="py-2 px-4 font-mono">showSearchButton</td>
                <td className="py-2 px-4">boolean</td>
                <td className="py-2 px-4">false</td>
                <td className="py-2 px-4">Show search button</td>
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

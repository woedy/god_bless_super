import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { Textarea } from '../ui/textarea';
import { 
  FaUpload as Upload, 
  FaDownload as Download, 
  FaFileAlt as FileText, 
  FaCheckCircle as CheckCircle, 
  FaExclamationTriangle as AlertTriangle, 
  FaServer as Server,
  FaEnvelope as Mail,
  FaCopy as Copy
} from 'react-icons/fa';

interface ImportResult {
  success: boolean;
  imported_count: number;
  errors: string[];
  error_count: number;
}

const ConfigurationImport: React.FC = () => {
  const [importFormat, setImportFormat] = useState<'json' | 'csv'>('json');
  const [importData, setImportData] = useState('');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sampleJsonConfig = {
    proxy_servers: [
      {
        host: "proxy1.example.com",
        port: 8080,
        username: "user1",
        password: "pass1",
        is_active: true
      },
      {
        host: "proxy2.example.com",
        port: 8080,
        username: "user2",
        password: "pass2",
        is_active: true
      }
    ],
    smtp_servers: [
      {
        host: "smtp1.example.com",
        port: 587,
        username: "smtp_user1",
        password: "smtp_pass1",
        use_tls: true,
        is_active: true
      },
      {
        host: "smtp2.example.com",
        port: 587,
        username: "smtp_user2",
        password: "smtp_pass2",
        use_tls: true,
        is_active: true
      }
    ]
  };

  const sampleCsvConfig = `type,host,port,username,password,use_tls,is_active
proxy,proxy1.example.com,8080,user1,pass1,,true
proxy,proxy2.example.com,8080,user2,pass2,,true
smtp,smtp1.example.com,587,smtp_user1,smtp_pass1,true,true
smtp,smtp2.example.com,587,smtp_user2,smtp_pass2,true,true`;

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setImportData(content);
      
      // Auto-detect format based on file extension
      if (file.name.endsWith('.json')) {
        setImportFormat('json');
      } else if (file.name.endsWith('.csv')) {
        setImportFormat('csv');
      }
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!importData.trim()) {
      return;
    }

    setImporting(true);
    setResult(null);

    try {
      let parsedData;
      
      if (importFormat === 'json') {
        try {
          parsedData = JSON.parse(importData);
        } catch (error) {
          throw new Error('Invalid JSON format');
        }
      } else {
        // For CSV, we'll send the raw data and let the backend parse it
        parsedData = importData;
      }

      const response = await fetch('/api/sms/configuration-import/import_servers/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          format: importFormat,
          data: parsedData
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setResult(data);
      } else {
        throw new Error('Import failed');
      }
    } catch (error) {
      console.error('Import failed:', error);
      setResult({
        success: false,
        imported_count: 0,
        errors: [error instanceof Error ? error.message : 'Import failed'],
        error_count: 1
      });
    } finally {
      setImporting(false);
    }
  };

  const loadSampleData = () => {
    if (importFormat === 'json') {
      setImportData(JSON.stringify(sampleJsonConfig, null, 2));
    } else {
      setImportData(sampleCsvConfig);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const downloadSample = () => {
    const data = importFormat === 'json' 
      ? JSON.stringify(sampleJsonConfig, null, 2)
      : sampleCsvConfig;
    
    const blob = new Blob([data], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sample_config.${importFormat}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Import Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Upload className="h-5 w-5" />
            <span>Import Server Configuration</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Format Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Import Format</label>
              <div className="flex space-x-2">
                <Button
                  variant={importFormat === 'json' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setImportFormat('json')}
                >
                  JSON
                </Button>
                <Button
                  variant={importFormat === 'csv' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setImportFormat('csv')}
                >
                  CSV
                </Button>
              </div>
            </div>

            {/* File Upload */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Upload File</label>
              <div className="flex items-center space-x-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={importFormat === 'json' ? '.json' : '.csv'}
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Choose File
                </Button>
                <span className="text-sm text-gray-500">
                  or paste configuration below
                </span>
              </div>
            </div>

            {/* Configuration Data */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Configuration Data</label>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadSampleData}
                  >
                    <FileText className="h-4 w-4 mr-1" />
                    Load Sample
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={downloadSample}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Download Sample
                  </Button>
                </div>
              </div>
              <Textarea
                value={importData}
                onChange={(e) => setImportData(e.target.value)}
                placeholder={`Paste your ${importFormat.toUpperCase()} configuration here...`}
                rows={12}
                className="font-mono text-sm"
              />
            </div>

            {/* Import Button */}
            <Button
              onClick={handleImport}
              disabled={!importData.trim() || importing}
              className="w-full"
            >
              {importing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Import Configuration
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Import Results */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              {result.success ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-red-600" />
              )}
              <span>Import Results</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 border rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{result.imported_count}</p>
                  <p className="text-sm text-gray-600">Successfully Imported</p>
                </div>
                <div className="text-center p-3 border rounded-lg">
                  <p className="text-2xl font-bold text-red-600">{result.error_count}</p>
                  <p className="text-sm text-gray-600">Errors</p>
                </div>
              </div>

              {/* Success Message */}
              {result.success && result.imported_count > 0 && (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription>
                    Successfully imported {result.imported_count} server configuration(s).
                  </AlertDescription>
                </Alert>
              )}

              {/* Errors */}
              {result.errors.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-red-700">Errors</h4>
                  <div className="space-y-1">
                    {result.errors.map((error, index) => (
                      <Alert key={index} className="border-red-200 bg-red-50">
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                        <AlertDescription className="text-sm">
                          {error}
                        </AlertDescription>
                      </Alert>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Format Documentation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Configuration Format</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* JSON Format */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm">JSON Format</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(JSON.stringify(sampleJsonConfig, null, 2))}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                <pre className="text-xs bg-gray-50 p-3 rounded border overflow-x-auto">
{JSON.stringify(sampleJsonConfig, null, 2)}
                </pre>
              </div>

              {/* CSV Format */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm">CSV Format</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(sampleCsvConfig)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                <pre className="text-xs bg-gray-50 p-3 rounded border overflow-x-auto">
{sampleCsvConfig}
                </pre>
              </div>
            </div>

            {/* Field Descriptions */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Field Descriptions</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h5 className="font-medium flex items-center space-x-1 mb-2">
                    <Server className="h-4 w-4" />
                    <span>Proxy Servers</span>
                  </h5>
                  <ul className="space-y-1 text-xs text-gray-600">
                    <li><strong>host:</strong> Proxy server hostname or IP</li>
                    <li><strong>port:</strong> Proxy server port number</li>
                    <li><strong>username:</strong> Authentication username</li>
                    <li><strong>password:</strong> Authentication password</li>
                    <li><strong>is_active:</strong> Enable/disable server</li>
                  </ul>
                </div>
                <div>
                  <h5 className="font-medium flex items-center space-x-1 mb-2">
                    <Mail className="h-4 w-4" />
                    <span>SMTP Servers</span>
                  </h5>
                  <ul className="space-y-1 text-xs text-gray-600">
                    <li><strong>host:</strong> SMTP server hostname</li>
                    <li><strong>port:</strong> SMTP server port (587, 465, 25)</li>
                    <li><strong>username:</strong> SMTP authentication username</li>
                    <li><strong>password:</strong> SMTP authentication password</li>
                    <li><strong>use_tls:</strong> Enable TLS encryption</li>
                    <li><strong>is_active:</strong> Enable/disable server</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ConfigurationImport;
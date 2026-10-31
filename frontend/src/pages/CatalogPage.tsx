import React from 'react';

export const CatalogPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Product Catalog & Quotation Templates</h2>
            <p className="text-xs text-slate-500">Contract designated for Member 2</p>
          </div>
          <span className="px-2.5 py-1 text-xs rounded-full bg-purple-100 text-purple-700 font-medium">
            Owner: Member 2
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 border border-slate-200 rounded-lg">
            <h3 className="text-sm font-semibold text-slate-800 mb-2">Entity Models</h3>
            <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-4">
              <li><strong className="text-slate-800">Product:</strong> Core SaaS product entity (e.g. Analytics Suite)</li>
              <li><strong className="text-slate-800">ProductVariant:</strong> Billing tier / SKU with metric & base price</li>
              <li><strong className="text-slate-800">QuotationTemplate:</strong> Enterprise proposal & contract terms</li>
            </ul>
          </div>

          <div className="p-4 border border-slate-200 rounded-lg">
            <h3 className="text-sm font-semibold text-slate-800 mb-2">API Contracts</h3>
            <ul className="text-xs font-mono text-slate-600 space-y-1.5">
              <li><span className="text-blue-600 font-bold">GET</span> /api/v1/catalog/products</li>
              <li><span className="text-emerald-600 font-bold">POST</span> /api/v1/catalog/products</li>
              <li><span className="text-emerald-600 font-bold">POST</span> /api/v1/catalog/products/&#123;id&#125;/variants</li>
              <li><span className="text-blue-600 font-bold">GET</span> /api/v1/catalog/quotation-templates</li>
              <li><span className="text-emerald-600 font-bold">POST</span> /api/v1/catalog/quotation-templates</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};


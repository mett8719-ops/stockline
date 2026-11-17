import { useState } from "react";
import { Download } from "lucide-react";
import Button from "@/components/ui/Button.jsx";
import Modal from "@/components/ui/Modal.jsx";
import { parseApiError } from "@/core/api/errors.js";
import {
  buildSalesReportCsv,
  buildStockReportCsv,
  downloadReportCsv,
} from "../exportCsv.js";
import { getSalesReport, getStockReport } from "../api.js";

function localDateInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDefaultDates() {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - 29);
  return { from: localDateInput(from), to: localDateInput(to) };
}

function getFilename(type, date = new Date()) {
  const dateSuffix = date.toISOString().slice(0, 10);
  return `stockline-rapport-${type}-${dateSuffix}.csv`;
}

export default function ExportReportButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [reportType, setReportType] = useState("sales");
  const [dates, setDates] = useState(getDefaultDates);
  const [errorMessage, setErrorMessage] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  async function handleExport() {
    if (reportType === "sales" && (!dates.from || !dates.to)) {
      setErrorMessage("Sélectionnez une date de début et une date de fin.");
      return;
    }

    if (reportType === "sales" && dates.from > dates.to) {
      setErrorMessage("La date de début doit précéder la date de fin.");
      return;
    }

    setErrorMessage("");
    setIsExporting(true);

    try {
      if (reportType === "sales") {
        const report = await getSalesReport({
          from: new Date(`${dates.from}T00:00:00`).toISOString(),
          to: new Date(`${dates.to}T23:59:59.999`).toISOString(),
        });
        downloadReportCsv(buildSalesReportCsv(report), getFilename("ventes"));
      } else {
        const report = await getStockReport();
        downloadReportCsv(buildStockReportCsv(report), getFilename("stock"));
      }

      setIsOpen(false);
    } catch (error) {
      setErrorMessage(parseApiError(error).message);
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <>
      <Button
        variant="secondary"
        className="gap-2"
        onClick={() => {
          setErrorMessage("");
          setIsOpen(true);
        }}
      >
        <Download className="h-4 w-4" aria-hidden="true" />
        Exporter un rapport
      </Button>

      <Modal
        isOpen={isOpen}
        onClose={() => {
          if (!isExporting) setIsOpen(false);
        }}
        title="Exporter un rapport"
        description="Téléchargez les indicateurs de ventes ou l’état actuel du stock au format CSV."
        size="md"
        closeOnOverlayClick={!isExporting}
        footer={
          <>
            <Button
              variant="secondary"
              disabled={isExporting}
              onClick={() => setIsOpen(false)}
            >
              Fermer
            </Button>
            <Button isLoading={isExporting} onClick={handleExport}>
              Télécharger le CSV
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">
              Type de rapport
            </span>
            <select
              className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              value={reportType}
              onChange={(event) => {
                setReportType(event.target.value);
                setErrorMessage("");
              }}
            >
              <option value="sales">Ventes (avec période)</option>
              <option value="stock">Stock actuel</option>
            </select>
          </label>

          {reportType === "sales" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">
                  Du
                </span>
                <input
                  type="date"
                  className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                  value={dates.from}
                  max={dates.to}
                  onChange={(event) =>
                    setDates((current) => ({ ...current, from: event.target.value }))
                  }
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">
                  Au
                </span>
                <input
                  type="date"
                  className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                  value={dates.to}
                  min={dates.from}
                  onChange={(event) =>
                    setDates((current) => ({ ...current, to: event.target.value }))
                  }
                />
              </label>
            </div>
          ) : (
            <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
              Le rapport de stock présente la valorisation et les alertes disponibles au moment de l’export.
            </p>
          )}

          {errorMessage && (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {errorMessage}
            </p>
          )}
        </div>
      </Modal>
    </>
  );
}

"use client";

import type { Medicine, MedicineMonthView, Symptom, SymptomLogDetail } from "@/lib/queries";
import { FloatingCTA } from "@jf/ui";
import { PlusSquareIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { DayDetailModal } from "./day-detail-modal";
import { DayHeaderRow } from "./day-header-row";
import { MedicineFormModal } from "./medicine-form-modal";
import { MedicineStrip } from "./medicine-strip";
import { MonthNav } from "./month-nav";

type Props = {
  monthViews: MedicineMonthView[];
  today: string;
  year: number;
  month: number;
  currentYear: number;
  currentMonth: number;
  symptoms: Symptom[];
  symptomLogsByDate: Record<string, SymptomLogDetail>;
};

export function MedicinesList({
  monthViews,
  today,
  year,
  month,
  currentYear,
  currentMonth,
  symptoms,
  symptomLogsByDate,
}: Props) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState<Medicine | undefined>(undefined);
  const [detailDate, setDetailDate] = useState<string | null>(null);

  function openCreate() {
    setEditingMedicine(undefined);
    setIsModalOpen(true);
  }

  function openEdit(medicine: Medicine) {
    setEditingMedicine(medicine);
    setIsModalOpen(true);
  }

  const days = monthViews[0]?.days.map((day) => ({ date: day.date, dayOfMonth: day.dayOfMonth }));
  const detailLog = detailDate ? symptomLogsByDate[detailDate] : undefined;
  const editingTypes = editingMedicine
    ? monthViews.find((view) => view.medicine.id === editingMedicine.id)?.types
    : undefined;

  return (
    <div className="flex w-full flex-col gap-4 px-4 pt-8 pb-24">
      {monthViews.length === 0 || !days ? (
        <p className="py-16 text-center text-(--grey-700)">No medicines yet.</p>
      ) : (
        <>
          <MonthNav
            year={year}
            month={month}
            currentYear={currentYear}
            currentMonth={currentMonth}
          />
          <DayHeaderRow
            days={days}
            today={today}
            symptomLogsByDate={symptomLogsByDate}
            onSelectDay={setDetailDate}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {monthViews.map(({ medicine, days: medicineDays }) => (
              <MedicineStrip
                key={medicine.id}
                medicine={medicine}
                days={medicineDays}
                today={today}
                year={year}
                month={month}
                onEdit={() => openEdit(medicine)}
              />
            ))}
          </div>
        </>
      )}

      <FloatingCTA icon={<PlusSquareIcon size={22} />} onClick={openCreate} />

      <MedicineFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        {...(editingMedicine !== undefined ? { medicine: editingMedicine } : {})}
        {...(editingTypes !== undefined ? { initialTypes: editingTypes } : {})}
      />

      {detailDate && (
        <DayDetailModal
          isOpen={detailDate !== null}
          onClose={() => setDetailDate(null)}
          date={detailDate}
          symptoms={symptoms}
          initialSymptomIds={detailLog?.symptomIds ?? []}
          initialNote={detailLog?.note ?? null}
        />
      )}
    </div>
  );
}

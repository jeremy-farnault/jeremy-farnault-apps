"use client";

import { useReverseGeocode } from "@/hooks/use-reverse-geocode";
import { generatePresignedUploadUrlAction, updateSpot } from "@/lib/actions";
import { CATEGORY_ICONS } from "@/lib/constants";
import type { CategoryRow, SpotRow } from "@/lib/queries";
import { ActionModal, Select, SelectItem, Skeleton, TextInput, Textarea } from "@jf/ui";
import { useState } from "react";
import { toast } from "sonner";
import { LocationSearchModal, type SelectedLocation } from "./location-search-modal";

type EditImageState =
  | { status: "existing" }
  | { status: "removed" }
  | { status: "pending"; file: File; previewUrl: string };

interface SpotDetailModalProps {
  spot: SpotRow | null;
  categories: CategoryRow[];
  onClose: () => void;
}

export function SpotDetailModal({ spot, categories, onClose }: SpotDetailModalProps) {
  const IconComp = spot?.category ? CATEGORY_ICONS[spot.category.icon] : undefined;
  const { address, loading: addressLoading } = useReverseGeocode(spot?.lat, spot?.lng);

  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [locationSearchOpen, setLocationSearchOpen] = useState(false);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [editForm, setEditForm] = useState({
    name: "",
    categoryId: "",
    description: "",
    lat: 0,
    lng: 0,
  });
  const [editImageState, setEditImageState] = useState<EditImageState>({ status: "existing" });

  const { address: editAddress, loading: editAddressLoading } = useReverseGeocode(
    isEditing ? editForm.lat : null,
    isEditing ? editForm.lng : null
  );

  function handleEnterEdit() {
    if (!spot) return;
    setEditForm({
      name: spot.name,
      categoryId: spot.category?.id ?? "",
      description: spot.description ?? "",
      lat: spot.lat,
      lng: spot.lng,
    });
    setEditImageState(spot.photoUrl ? { status: "existing" } : { status: "removed" });
    setFileInputKey((k) => k + 1);
    setIsEditing(true);
  }

  function handleCancelEdit() {
    setIsEditing(false);
  }

  function handleLocationSelect(loc: SelectedLocation) {
    setEditForm((f) => ({ ...f, lat: loc.lat, lng: loc.lng }));
    setLocationSearchOpen(false);
  }

  async function handleSave() {
    if (!spot) return;
    if (!editForm.name.trim()) {
      toast.error("Name is required");
      return;
    }
    setSubmitting(true);
    try {
      let photoKey: string | null | undefined;
      if (editImageState.status === "pending") {
        const { key, url } = await generatePresignedUploadUrlAction(editImageState.file.name);
        await fetch(url, {
          method: "PUT",
          body: editImageState.file,
          headers: { "Content-Type": editImageState.file.type },
        });
        photoKey = key;
      } else if (editImageState.status === "removed") {
        photoKey = null;
      } else {
        photoKey = undefined;
      }
      await updateSpot({
        id: spot.id,
        name: editForm.name,
        lat: editForm.lat,
        lng: editForm.lng,
        categoryId: editForm.categoryId || null,
        description: editForm.description.trim() || null,
        photoKey,
      });
      toast.success("Spot updated");
      setIsEditing(false);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  const editPreviewUrl = editImageState.status === "pending" ? editImageState.previewUrl : null;

  const viewContent = spot && (
    <div className="flex flex-col gap-3">
      {spot.photoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={spot.photoUrl}
          alt={spot.name}
          className="h-40 w-full rounded-[12px] object-cover"
        />
      )}
      {spot.category && (
        <div className="flex items-center gap-2">
          <span
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
            style={{ backgroundColor: spot.category.color }}
          >
            {IconComp && <IconComp size={14} className="text-white" />}
          </span>
          <span className="text-sm text-(--grey-700)">{spot.category.name}</span>
        </div>
      )}
      {spot.description && <p className="text-sm text-(--grey-700)">{spot.description}</p>}
      <div className="flex flex-col gap-1">
        {addressLoading && <Skeleton height={12} className="rounded" />}
        {address && <p className="text-xs text-(--grey-500)">{address}</p>}
        <p className="font-mono text-xs text-(--grey-400)">
          {spot.lat.toFixed(5)}, {spot.lng.toFixed(5)}
        </p>
      </div>
    </div>
  );

  const editContent = (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium text-(--grey-700)">Photo</span>
        {editPreviewUrl ? (
          <div className="relative w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={editPreviewUrl}
              alt="Preview"
              className="h-40 w-full rounded-[12px] object-cover"
            />
            <button
              type="button"
              onClick={() => {
                setEditImageState({ status: "removed" });
                setFileInputKey((k) => k + 1);
              }}
              className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
              aria-label="Remove photo"
            >
              ×
            </button>
          </div>
        ) : editImageState.status === "existing" && spot?.photoUrl ? (
          <div className="relative w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={spot.photoUrl}
              alt={spot.name}
              className="h-40 w-full rounded-[12px] object-cover"
            />
            <button
              type="button"
              onClick={() => setEditImageState({ status: "removed" })}
              className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
              aria-label="Remove photo"
            >
              ×
            </button>
          </div>
        ) : (
          <input
            key={fileInputKey}
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setEditImageState({ status: "pending", file, previewUrl: URL.createObjectURL(file) });
            }}
            className="text-sm text-(--grey-700) file:mr-3 file:cursor-pointer file:rounded-[8px] file:border-0 file:bg-(--surface-150) file:px-3 file:py-1.5 file:text-sm file:text-(--grey-900) hover:file:bg-(--surface-200)"
          />
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="edit-name" className="text-sm font-medium text-(--grey-700)">
          Name
        </label>
        <TextInput
          id="edit-name"
          value={editForm.name}
          onChange={(v) => setEditForm((f) => ({ ...f, name: v }))}
          placeholder="Spot name"
          disabled={submitting}
        />
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium text-(--grey-700)">Category</span>
        <Select
          value={editForm.categoryId}
          onValueChange={(v) => setEditForm((f) => ({ ...f, categoryId: v }))}
          disabled={submitting}
          placeholder="No category"
        >
          {categories.map((cat) => (
            <SelectItem key={cat.id} value={cat.id}>
              {cat.name}
            </SelectItem>
          ))}
        </Select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="edit-description" className="text-sm font-medium text-(--grey-700)">
          Description
        </label>
        <Textarea
          id="edit-description"
          value={editForm.description}
          onChange={(v) => setEditForm((f) => ({ ...f, description: v }))}
          placeholder="A note about this spot (optional)"
          disabled={submitting}
        />
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium text-(--grey-700)">Location</span>
        <button
          type="button"
          onClick={() => setLocationSearchOpen(true)}
          disabled={submitting}
          className="flex h-10 items-center justify-center rounded-xl border border-(--border) text-sm text-(--grey-700) hover:bg-(--surface-150) disabled:cursor-not-allowed disabled:opacity-50"
        >
          Change location
        </button>
        <div className="flex flex-col gap-1 mt-1">
          {editAddressLoading && <Skeleton height={12} className="rounded" />}
          {editAddress && <p className="text-xs text-(--grey-500)">{editAddress}</p>}
          <p className="font-mono text-xs text-(--grey-400)">
            {editForm.lat.toFixed(5)}, {editForm.lng.toFixed(5)}
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <ActionModal
        isOpen={!!spot}
        onClose={isEditing ? handleCancelEdit : onClose}
        size={isEditing ? "large" : "small"}
        title={isEditing ? "Edit Spot" : (spot?.name ?? "")}
        closeOnBackdropClick={!isEditing}
        content={isEditing ? editContent : viewContent}
        primaryButton={
          isEditing
            ? { label: "Save", loading: submitting, onClick: handleSave }
            : { label: "Edit", onClick: handleEnterEdit }
        }
        secondaryButton={
          isEditing
            ? { label: "Cancel", onClick: handleCancelEdit }
            : { label: "Close", onClick: onClose }
        }
      />

      <LocationSearchModal
        isOpen={locationSearchOpen}
        onClose={() => setLocationSearchOpen(false)}
        onSelect={handleLocationSelect}
      />
    </>
  );
}

import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Page } from '../components/Page.tsx'
import { tr } from '../i18n/index.ts'
import { db } from '../db/index.ts'
import type { Reminder, ReminderType, Message } from '../db/schema.ts'
import {
  createReminder,
  updateReminder,
  deleteReminder,
  setEnabled,
  addMessage,
  updateMessage,
  deleteMessage,
} from '../db/reminders-repo.ts'

type ReminderFormData = {
  title: string
  type: ReminderType
  times: string[]
}

type EditState =
  | { mode: 'view' }
  | { mode: 'create' }
  | { mode: 'edit'; id: string }
  | { mode: 'messages'; id: string }

type ModalState =
  | { open: false }
  | {
      open: true
      title: string
      message: string
      onConfirm: () => void
    }

export function HatirlatmalarPage() {
  const reminders = useLiveQuery(() => db.reminders.toArray(), [])
  const [editState, setEditState] = useState<EditState>({ mode: 'view' })
  const [modal, setModal] = useState<ModalState>({ open: false })

  const handleCreate = () => {
    setEditState({ mode: 'create' })
  }

  const handleEdit = (id: string) => {
    setEditState({ mode: 'edit', id })
  }

  const handleDelete = (id: string) => {
    const reminder = reminders?.find((r: Reminder) => r.id === id)
    if (!reminder) return
    setModal({
      open: true,
      title: tr.reminders.deleteTitle,
      message: tr.reminders.deleteMessage(reminder.title),
      onConfirm: async () => {
        await deleteReminder(id)
        setModal({ open: false })
      },
    })
  }

  const handleToggle = async (id: string, enabled: boolean) => {
    await setEnabled(id, enabled)
  }

  const handleMessages = (id: string) => {
    setEditState({ mode: 'messages', id })
  }

  const handleCancel = () => {
    setEditState({ mode: 'view' })
  }

  const handleSave = async (data: ReminderFormData) => {
    if (editState.mode === 'create') {
      await createReminder(data.type, data.title, data.times)
    } else if (editState.mode === 'edit') {
      await updateReminder(editState.id, {
        title: data.title,
        times: data.times,
      })
    }
    setEditState({ mode: 'view' })
  }

  if (!reminders) {
    return (
      <Page title={tr.nav.hatirlatmalar}>
        <p>{tr.common.loading}</p>
      </Page>
    )
  }

  if (editState.mode === 'create') {
    return (
      <Page title={tr.reminders.createTitle}>
        <ReminderForm onSave={handleSave} onCancel={handleCancel} />
      </Page>
    )
  }

  if (editState.mode === 'edit') {
    const reminder = reminders.find((r: Reminder) => r.id === editState.id)
    if (!reminder) {
      setEditState({ mode: 'view' })
      return null
    }
    return (
      <Page title={tr.reminders.editTitle}>
        <ReminderForm
          initialData={{
            title: reminder.title,
            type: reminder.type,
            times: reminder.times,
          }}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      </Page>
    )
  }

  if (editState.mode === 'messages') {
    return (
      <MessageList
        reminderId={editState.id}
        onBack={() => setEditState({ mode: 'view' })}
        onShowModal={setModal}
      />
    )
  }

  return (
    <Page title={tr.nav.hatirlatmalar}>
      <div className="reminders-header">
        <button
          type="button"
          className="button add-reminder-button"
          onClick={handleCreate}
        >
          {tr.reminders.add}
        </button>
      </div>

      {reminders.length === 0 ? (
        <p className="empty-message">{tr.reminders.empty}</p>
      ) : (
        <div className="reminders-list">
          {reminders.map((reminder: Reminder) => (
            <ReminderCard
              key={reminder.id}
              reminder={reminder}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onToggle={handleToggle}
              onMessages={handleMessages}
            />
          ))}
        </div>
      )}

      {modal.open && (
        <ConfirmModal
          title={modal.title}
          message={modal.message}
          onConfirm={modal.onConfirm}
          onCancel={() => setModal({ open: false })}
        />
      )}
    </Page>
  )
}

// ============================================================================
// ReminderCard
// ============================================================================

type ReminderCardProps = {
  reminder: Reminder
  onEdit: (id: string) => void
  onDelete: (id: string) => void
  onToggle: (id: string, enabled: boolean) => void
  onMessages: (id: string) => void
}

function ReminderCard({
  reminder,
  onEdit,
  onDelete,
  onToggle,
  onMessages,
}: ReminderCardProps) {
  const messages = useLiveQuery(
    () => db.messages.where('reminderId').equals(reminder.id).toArray(),
    [reminder.id]
  )

  const typeIcon = {
    water: '💧',
    meal: '🍽️',
    supplement: '💊',
  }[reminder.type]

  return (
    <div className={`reminder-card ${reminder.enabled ? '' : 'disabled'}`}>
      <div className="reminder-card-header">
        <div className="reminder-title-row">
          <span className="reminder-icon">{typeIcon}</span>
          <h3 className="reminder-title">{reminder.title}</h3>
        </div>
        <label className="toggle-switch">
          <input
            type="checkbox"
            checked={reminder.enabled}
            onChange={(e) => onToggle(reminder.id, e.target.checked)}
          />
          <span className="toggle-slider"></span>
        </label>
      </div>

      <div className="reminder-times">
        {reminder.times.map((time) => (
          <span key={time} className="time-badge">
            {time}
          </span>
        ))}
      </div>

      <div className="reminder-stats">
        <span className="stat-item">
          {tr.reminders.messageCount(messages?.length ?? 0)}
        </span>
      </div>

      <div className="reminder-actions">
        <button
          type="button"
          className="action-button"
          onClick={() => onMessages(reminder.id)}
        >
          {tr.reminders.messages}
        </button>
        <button
          type="button"
          className="action-button"
          onClick={() => onEdit(reminder.id)}
        >
          {tr.reminders.edit}
        </button>
        <button
          type="button"
          className="action-button danger"
          onClick={() => onDelete(reminder.id)}
        >
          {tr.reminders.delete}
        </button>
      </div>
    </div>
  )
}

// ============================================================================
// ReminderForm
// ============================================================================

type ReminderFormProps = {
  initialData?: ReminderFormData
  onSave: (data: ReminderFormData) => void
  onCancel: () => void
}

function ReminderForm({ initialData, onSave, onCancel }: ReminderFormProps) {
  const [title, setTitle] = useState(initialData?.title ?? '')
  const [type, setType] = useState<ReminderType>(initialData?.type ?? 'water')
  const [times, setTimes] = useState<string[]>(initialData?.times ?? [])
  const [newTime, setNewTime] = useState('')

  const handleAddTime = () => {
    if (!newTime) return
    if (times.includes(newTime)) {
      alert(tr.reminders.timeDuplicate)
      return
    }
    if (times.length >= 12) {
      alert(tr.reminders.timeLimit)
      return
    }
    const sorted = [...times, newTime].sort()
    setTimes(sorted)
    setNewTime('')
  }

  const handleRemoveTime = (time: string) => {
    setTimes(times.filter((t) => t !== time))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      alert(tr.reminders.titleRequired)
      return
    }
    if (times.length === 0) {
      alert(tr.reminders.timesRequired)
      return
    }
    onSave({ title: title.trim(), type, times })
  }

  return (
    <form className="reminder-form" onSubmit={handleSubmit}>
      <div className="form-group">
        <label htmlFor="title">{tr.reminders.titleLabel}</label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={tr.reminders.titlePlaceholder}
          className="form-input"
        />
      </div>

      <div className="form-group">
        <label>{tr.reminders.typeLabel}</label>
        <div className="type-buttons">
          <button
            type="button"
            className={`type-button ${type === 'water' ? 'active' : ''}`}
            onClick={() => setType('water')}
          >
            💧 {tr.reminders.types.water}
          </button>
          <button
            type="button"
            className={`type-button ${type === 'meal' ? 'active' : ''}`}
            onClick={() => setType('meal')}
          >
            🍽️ {tr.reminders.types.meal}
          </button>
          <button
            type="button"
            className={`type-button ${type === 'supplement' ? 'active' : ''}`}
            onClick={() => setType('supplement')}
          >
            💊 {tr.reminders.types.supplement}
          </button>
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="new-time">{tr.reminders.timesLabel}</label>
        <div className="time-input-row">
          <input
            id="new-time"
            type="time"
            value={newTime}
            onChange={(e) => setNewTime(e.target.value)}
            className="form-input"
          />
          <button
            type="button"
            onClick={handleAddTime}
            className="button add-time-button"
            disabled={times.length >= 12}
          >
            {tr.reminders.addTime}
          </button>
        </div>
        <p className="help-text">{tr.reminders.timesHelp}</p>
      </div>

      {times.length > 0 && (
        <div className="times-list">
          {times.map((time) => (
            <div key={time} className="time-item">
              <span>{time}</span>
              <button
                type="button"
                onClick={() => handleRemoveTime(time)}
                className="remove-time-button"
                aria-label={tr.reminders.removeTime}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="form-actions">
        <button type="button" onClick={onCancel} className="button secondary">
          {tr.reminders.cancel}
        </button>
        <button type="submit" className="button">
          {tr.reminders.save}
        </button>
      </div>
    </form>
  )
}

// ============================================================================
// MessageList
// ============================================================================

type MessageListProps = {
  reminderId: string
  onBack: () => void
  onShowModal: (modal: ModalState) => void
}

function MessageList({ reminderId, onBack, onShowModal }: MessageListProps) {
  const reminder = useLiveQuery(() => db.reminders.get(reminderId), [reminderId])
  const messages = useLiveQuery(
    () => db.messages.where('reminderId').equals(reminderId).toArray(),
    [reminderId]
  )
  const [editingId, setEditingId] = useState<string | null>(null)
  const [newMessageText, setNewMessageText] = useState('')
  const [editText, setEditText] = useState('')

  const handleAddMessage = async () => {
    if (!newMessageText.trim()) {
      alert(tr.reminders.messageRequired)
      return
    }
    await addMessage(reminderId, newMessageText.trim(), 'tr')
    setNewMessageText('')
  }

  const handleEditMessage = (id: string, text: string) => {
    setEditingId(id)
    setEditText(text)
  }

  const handleSaveEdit = async (id: string) => {
    if (!editText.trim()) {
      alert(tr.reminders.messageRequired)
      return
    }
    await updateMessage(id, editText.trim())
    setEditingId(null)
    setEditText('')
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditText('')
  }

  const handleDeleteMessage = (id: string) => {
    onShowModal({
      open: true,
      title: tr.reminders.deleteMessageTitle,
      message: tr.reminders.deleteMessageMessage,
      onConfirm: async () => {
        await deleteMessage(id)
        onShowModal({ open: false })
      },
    })
  }

  if (!reminder || !messages) {
    return (
      <Page title={tr.reminders.messagesTitle}>
        <p>{tr.common.loading}</p>
      </Page>
    )
  }

  return (
    <Page title={tr.reminders.messagesTitle}>
      <div className="messages-header">
        <button type="button" onClick={onBack} className="button secondary">
          {tr.reminders.back}
        </button>
        <h2 className="messages-reminder-title">{reminder.title}</h2>
      </div>

      <div className="add-message-form">
        <textarea
          value={newMessageText}
          onChange={(e) => setNewMessageText(e.target.value)}
          placeholder={tr.reminders.messagePlaceholder}
          className="message-textarea"
          rows={3}
        />
        <button
          type="button"
          onClick={handleAddMessage}
          className="button add-message-button"
        >
          {tr.reminders.addMessage}
        </button>
      </div>

      {messages.length === 0 ? (
        <p className="empty-message">{tr.reminders.messagesEmpty}</p>
      ) : (
        <div className="messages-list">
          {messages.map((message: Message) => (
            <div key={message.id} className="message-item">
              {editingId === message.id ? (
                <div className="message-edit-form">
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="message-textarea"
                    rows={3}
                  />
                  <div className="message-edit-actions">
                    <button
                      type="button"
                      onClick={() => handleSaveEdit(message.id)}
                      className="button small"
                    >
                      {tr.reminders.save}
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="button secondary small"
                    >
                      {tr.reminders.cancel}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="message-text">{message.text}</p>
                  <div className="message-actions">
                    <button
                      type="button"
                      onClick={() => handleEditMessage(message.id, message.text)}
                      className="action-button small"
                    >
                      {tr.reminders.edit}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteMessage(message.id)}
                      className="action-button danger small"
                    >
                      {tr.reminders.delete}
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </Page>
  )
}

// ============================================================================
// ConfirmModal
// ============================================================================

type ConfirmModalProps = {
  title: string
  message: string
  onConfirm: () => void
  onCancel: () => void
}

function ConfirmModal({
  title,
  message,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">{title}</h2>
        <p className="modal-message">{message}</p>
        <div className="modal-actions">
          <button type="button" onClick={onCancel} className="button secondary">
            {tr.reminders.cancel}
          </button>
          <button type="button" onClick={onConfirm} className="button danger">
            {tr.reminders.confirmDelete}
          </button>
        </div>
      </div>
    </div>
  )
}

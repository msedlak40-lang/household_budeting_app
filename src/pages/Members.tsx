import { useState } from 'react'
import { useMembers } from '@/hooks/useMembers'

export default function Members() {
  const { members, loading, error, addMember, updateMember, deleteMember } = useMembers()
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({ name: '', role: 'adult' as 'adult' | 'child' })
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')

    if (!formData.name.trim()) {
      setFormError('Name is required')
      return
    }

    setSubmitting(true)

    if (editingId) {
      const { error } = await updateMember(editingId, formData.name, formData.role)
      if (error) {
        setFormError(error)
      } else {
        setEditingId(null)
        setFormData({ name: '', role: 'adult' })
        setIsAdding(false)
      }
    } else {
      const { error } = await addMember(formData.name, formData.role)
      if (error) {
        setFormError(error)
      } else {
        setFormData({ name: '', role: 'adult' })
        setIsAdding(false)
      }
    }

    setSubmitting(false)
  }

  const handleEdit = (member: typeof members[0]) => {
    setEditingId(member.id)
    setFormData({ name: member.name, role: member.role })
    setIsAdding(true)
    setFormError('')
  }

  const handleCancel = () => {
    setIsAdding(false)
    setEditingId(null)
    setFormData({ name: '', role: 'adult' })
    setFormError('')
  }

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete ${name}?`)) {
      const { error } = await deleteMember(id)
      if (error) {
        alert(`Error: ${error}`)
      }
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-lg">Loading members...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-red-600">Error: {error}</div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Household Members</h1>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Add Member
          </button>
        )}
      </div>

      {isAdding && (
        <div className="mb-6 p-4 bg-white rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">
            {editingId ? 'Edit Member' : 'Add New Member'}
          </h2>
          {formError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
              {formError}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Name
              </label>
              <input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter name"
                disabled={submitting}
              />
            </div>
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                Role
              </label>
              <select
                id="role"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as 'adult' | 'child' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={submitting}
              >
                <option value="adult">Adult</option>
                <option value="child">Child</option>
              </select>
            </div>
            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? 'Saving...' : editingId ? 'Update' : 'Add'}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                disabled={submitting}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {members.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-gray-500 mb-4">No members added yet</p>
          {!isAdding && (
            <button
              onClick={() => setIsAdding(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Add Your First Member
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {members.map((member) => (
                <tr key={member.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {member.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        member.role === 'adult'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-green-100 text-green-800'
                      }`}
                    >
                      {member.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                    <button
                      onClick={() => handleEdit(member)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(member.id, member.name)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

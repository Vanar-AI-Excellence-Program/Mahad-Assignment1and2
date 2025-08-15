<script lang="ts">
  import type { PageData } from './$types';
  export let data: PageData;

  let promoting: Record<string, boolean> = {};
  let demoting: Record<string, boolean> = {};

  async function setRole(userId: string, role: 'admin' | 'user') {
    try {
      role === 'admin' ? promoting[userId] = true : demoting[userId] = true;
      const res = await fetch('/api/admin/users/role', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role })
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        alert(j.error || 'Failed to update role');
        return;
      }
      location.reload();
    } finally {
      promoting[userId] = false;
      demoting[userId] = false;
    }
  }
</script>

<div class="px-4 sm:px-6 lg:px-8 py-8">
  <div class="mb-6">
    <h1 class="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
    <p class="text-gray-600 mt-1">Manage users and view system analytics</p>
  </div>

  <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
    <div class="card">
      <div class="text-sm text-gray-600">Total Users</div>
      <div class="text-2xl font-semibold text-blue-600">{data.stats.total}</div>
    </div>
    <div class="card">
      <div class="text-sm text-gray-600">Verified Users</div>
      <div class="text-2xl font-semibold text-green-600">{data.stats.verified}</div>
    </div>
    <div class="card">
      <div class="text-sm text-gray-600">Admin Users</div>
      <div class="text-2xl font-semibold text-purple-600">{data.stats.admins}</div>
    </div>
    <div class="card">
      <div class="text-sm text-gray-600">Unverified</div>
      <div class="text-2xl font-semibold text-orange-600">{data.stats.total - data.stats.verified}</div>
    </div>
  </div>

  <div class="card">
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-lg font-medium">User Management</h2>
      <div class="text-sm text-gray-500">Showing {data.users.length} of {data.stats.total} users</div>
    </div>
    <div class="overflow-x-auto">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
            <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          {#each data.users as u}
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3 text-sm font-medium text-gray-900">{u.email}</td>
              <td class="px-4 py-3 text-sm">
                {#if u.emailVerified}
                  <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Verified
                  </span>
                {:else}
                  <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    Unverified
                  </span>
                {/if}
              </td>
              <td class="px-4 py-3 text-sm">
                {#if (u as any).role === 'admin'}
                  <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                    Admin
                  </span>
                {:else}
                  <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    User
                  </span>
                {/if}
              </td>
              <td class="px-4 py-3 text-sm text-gray-500">
                {new Date(u.createdAt).toLocaleDateString()}
              </td>
              <td class="px-4 py-3 text-sm text-right space-x-2">
                {#if (u as any).role !== 'admin'}
                  <button 
                    class="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50" 
                    disabled={promoting[u.id]} 
                    on:click={() => setRole(u.id, 'admin')}
                  >
                    {promoting[u.id] ? 'Promoting...' : 'Make Admin'}
                  </button>
                {:else}
                  <button 
                    class="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50" 
                    disabled={demoting[u.id]} 
                    on:click={() => setRole(u.id, 'user')}
                  >
                    {demoting[u.id] ? 'Demoting...' : 'Remove Admin'}
                  </button>
                {/if}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </div>
</div>



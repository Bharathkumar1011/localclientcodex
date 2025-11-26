import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Users, 
  UserCheck, 
  Settings, 
  TrendingUp, 
  Shield,
  Mail,
  Search,
  Filter,
  FileUser,
  XSquare,
  Loader2,
  UserPlus,
  Trash2,
  RefreshCw
} from "lucide-react";
import type { User } from "@/lib/types";
import InvitationManagement from "./InvitationManagement";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";


interface UserAnalytics {
  totalUsers: number;
  usersByRole: { [role: string]: number };
  userLeadCounts: Array<{
    userId: string;
    firstName: string;
    lastName: string;
    role: string;
    assignedLeads: number;
    leadsByStage: { [stage: string]: number };
  }>;
}

// User creation form schema with conditional validation
const createUserSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  role: z.enum(['analyst', 'partner', 'admin', 'intern'], {
    required_error: "Role is required",
  }),
  analystId: z.string().optional(),
}).refine(data => {
  // For interns, analystId is required
  if (data.role === 'intern' && !data.analystId) {
    return false;
  }
  return true;
}, {
  message: "Analyst assignment is required for interns",
  path: ["analystId"],
});

interface UserManagementProps {
  currentUser: User;
}

export default function UserManagement({ currentUser }: UserManagementProps) {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [showCreateUserDialog, setShowCreateUserDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showOwnershipTransferDialog, setShowOwnershipTransferDialog] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [userToTransfer, setUserToTransfer] = useState<User | null>(null);
  const [transferToUser, setTransferToUser] = useState<string>("");
  // For suspend / reactivate dialog
  const [showSuspendDialog, setShowSuspendDialog] = useState(false);
  const [userToSuspend, setUserToSuspend] = useState<User | null>(null);


  // User creation form
  const createUserForm = useForm<z.infer<typeof createUserSchema>>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      role: "analyst",
    },
  });

  // Check if current user is admin
  const isAdmin = currentUser.role === 'admin';
  const canAccessUserManagement = ['partner', 'admin'].includes(currentUser.role);

  // Fetch user analytics
  // const { data: analytics, isLoading: analyticsLoading } = useQuery<UserAnalytics>({
  //   queryKey: ['/users/analytics'],
  //   enabled: canAccessUserManagement,
  //   queryFn: async ({ queryKey }) => {
  //     const res = await fetch(queryKey.join("/") as string, {
  //       credentials: "include",
  //     });
  //     if (!res.ok) {
  //       throw new Error(`${res.status}: ${res.statusText}`);
  //     }
  //     return await res.json();
  //   }
  // });

  const { data: analytics, isLoading: analyticsLoading } = useQuery<UserAnalytics>({
    queryKey: ['users-analytics'],
    enabled: canAccessUserManagement,
    queryFn: async () => {
      const res = await fetch(`${API_URL}/users/analytics`, {
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        throw new Error(`${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      return data;
    },
  });




  // Fetch all users
  // const { data: users, isLoading: usersLoading, error: usersError } = useQuery<User[]>({
  //   queryKey: ['/api/users'],
  //   enabled: canAccessUserManagement,
  //   queryFn: async ({ queryKey }) => {
  //     const res = await fetch(queryKey.join("/") as string, {
  //       credentials: "include",
  //     });
  //     if (!res.ok) {
  //       throw new Error(`${res.status}: ${res.statusText}`);
  //     }
  //     return await res.json();
  //   }
  // });

  const { data: users, isLoading: usersLoading, error: usersError } = useQuery<User[]>({
    queryKey: ['users'],
    enabled: canAccessUserManagement,
    queryFn: async () => {
      const res = await fetch(`${API_URL}/users`, {
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        throw new Error(`${res.status}: ${res.statusText}`);
      }

      // ✅ Return the parsed JSON
      const data = await res.json();
      return data;
    },
  });


  // Update user role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      return apiRequest('PUT', `/users/${userId}/role`, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      queryClient.invalidateQueries({ queryKey: ['/users/analytics'] });
      toast({
        title: "Role Updated",
        description: `User role has been updated successfully.`,
      });
      setShowRoleDialog(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update user role",
        variant: "destructive",
      });
    },
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (userData: z.infer<typeof createUserSchema>) => {
      // Generate a unique ID for the user
      const userWithId = {
        ...userData,
        id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      };
      return apiRequest('POST', '/users', userWithId);
    },
    onSuccess: (newUser) => {
      // Force refetch of both users and analytics queries
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      queryClient.invalidateQueries({ queryKey: ['/users/analytics'] });
      // Also manually refetch to ensure immediate update
      queryClient.refetchQueries({ queryKey: ['/api/users'] });
      queryClient.refetchQueries({ queryKey: ['/users/analytics'] });
      
      toast({
        title: "User Created",
        description: "New user has been created successfully.",
      });
      setShowCreateUserDialog(false);
      createUserForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create user",
        variant: "destructive",
      });
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      return apiRequest('DELETE', `/users/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      queryClient.invalidateQueries({ queryKey: ['/users/analytics'] });
      toast({
        title: "User Deleted",
        description: "User has been deleted successfully.",
      });
      setShowDeleteDialog(false);
      setUserToDelete(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete user",
        variant: "destructive",
      });
    },
  });

  // Suspend / Reactivate user mutation
  const suspendUserMutation = useMutation({
    mutationFn: async ({ userId, suspend }: { userId: string; suspend: boolean }) => {
      return apiRequest('PATCH', `/users/${userId}/suspend`, { suspend });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      queryClient.invalidateQueries({ queryKey: ['/users/analytics'] });
      toast({
        title: "User Updated",
        description: "User suspension status has been updated.",
      });
      setShowSuspendDialog(false);
      setUserToSuspend(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update user suspension status",
        variant: "destructive",
      });
    },
  });

  // Ownership transfer mutation
  const ownershipTransferMutation = useMutation({
    mutationFn: async ({ fromUserId, toUserId }: { fromUserId: string; toUserId: string }) => {
      return apiRequest('POST', '/users/transfer-ownership', { fromUserId, toUserId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'], refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: ['/users/analytics'], refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: ['leads'], refetchType: 'active' });
      toast({
        title: "Ownership Transferred",
        description: "All leads have been transferred successfully.",
      });
      setShowOwnershipTransferDialog(false);
      setUserToTransfer(null);
      setTransferToUser("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to transfer ownership",
        variant: "destructive",
      });
    },
  });


  // Filter users based on search and role
  const filteredUsers = users?.filter(user => {
    const matchesSearch = `${user.firstName} ${user.lastName} ${user.email}`.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    return matchesSearch && matchesRole;
  }) || [];

  // Get user stats from analytics
  const getUserStats = (userId: string) => {
    return analytics?.userLeadCounts.find(u => u.userId === userId) || {
      assignedLeads: 0,
      leadsByStage: {}
    };
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800 border-red-200';
      case 'partner': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'analyst': return 'bg-green-100 text-green-800 border-green-200';
      case 'intern': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleUpdateRole = (user: any) => {
    setSelectedUser(user);
    setShowRoleDialog(true);
  };

  const handleConfirmRoleUpdate = (newRole: string) => {
    if (selectedUser) {
      updateRoleMutation.mutate({ userId: selectedUser.id, role: newRole });
    }
  };


  const handleCreateUser = (userData: z.infer<typeof createUserSchema>) => {
    createUserMutation.mutate(userData);
  };

  const handleDeleteUser = (user: User) => {
    setUserToDelete(user);
    setShowDeleteDialog(true);
  };

  const confirmDeleteUser = () => {
    if (userToDelete) {
      deleteUserMutation.mutate(userToDelete.id);
    }
  };

  const handleOwnershipTransfer = (user: User) => {
    setUserToTransfer(user);
    setShowOwnershipTransferDialog(true);
  };

  const confirmOwnershipTransfer = () => {
    if (userToTransfer && transferToUser) {
      ownershipTransferMutation.mutate({ 
        fromUserId: userToTransfer.id, 
        toUserId: transferToUser 
      });
    }
  };

  // Filter users for role-based access control
  const canManageUser = (targetUser: User) => {
    if (currentUser.role === 'admin') return true;
    if (currentUser.role === 'partner' && targetUser.role === 'analyst') return true;
    return false;
  };

  // Check permissions
  if (!canAccessUserManagement) {
    return (
      <Card className="max-w-md mx-auto mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Access Restricted
          </CardTitle>
          <CardDescription>
            Only partners and administrators can access user management features.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Only show loading if the user has access and queries are actually loading
  if (canAccessUserManagement && (analyticsLoading || usersLoading)) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading user management...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">
            Manage users, roles, and lead assignments across your investment banking team
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Button
              onClick={() => setShowCreateUserDialog(true)}
              className="flex items-center gap-2"
              data-testid="button-create-user"
            >
              <UserPlus className="h-4 w-4" />
              Create User
            </Button>
          )}
        </div>
      </div>

      {/* Analytics Cards */}
      {analytics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Total Users */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.totalUsers}</div>
            </CardContent>
          </Card>

          {/* Admins */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Admins</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.usersByRole.admin || 0}</div>
            </CardContent>
          </Card>

          {/* Partners */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Partners</CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.usersByRole.partner || 0}</div>
            </CardContent>
          </Card>

          {/* Analysts */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Analysts</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.usersByRole.analyst || 0}</div>
            </CardContent>
          </Card>

          {/* 🆕 Interns */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Interns</CardTitle>
              <FileUser className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.usersByRole.intern || 0}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Team Invitations - Admin and Partner only */}
      {(currentUser.role === 'admin' || currentUser.role === 'partner') && (
        <InvitationManagement currentUser={currentUser} />
      )}

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
            data-testid="input-search-users"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-48" data-testid="select-role-filter">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="admin">Admins</SelectItem>
            <SelectItem value="partner">Partners</SelectItem>
            <SelectItem value="analyst">Analysts</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* User Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileUser className="h-5 w-5" />
            Team Members ({filteredUsers.length})
          </CardTitle>
          <CardDescription>
            View and manage user roles and lead assignments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredUsers.map((user) => {
              const userStats = getUserStats(user.id);
              return (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover-elevate"
                  data-testid={`user-row-${user.id}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <span className="font-semibold text-primary">
                        {(user.firstName || 'U')[0]}{(user.lastName || 'U')[0]}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-base">
                        {user.firstName || 'Unknown'} {user.lastName || 'User'}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        {user.email}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <div className="text-lg font-semibold">{userStats.assignedLeads}</div>
                      <div className="text-xs text-muted-foreground">Leads</div>
                    </div>
                    
                    <div className="flex flex-col gap-1">
                      {Object.entries(userStats.leadsByStage).map(([stage, count]) => (
                        <div key={stage} className="text-xs flex items-center gap-1">
                          <span className="capitalize">{stage}:</span>
                          <Badge variant="outline" className="h-5 text-xs">
                            {count}
                          </Badge>
                        </div>
                      ))}
                    </div>

                    <Badge 
                      className={getRoleBadgeColor(user.role)}
                      data-testid={`badge-role-${user.role}`}
                    >
                      {user.role}
                    </Badge>

                    <div className="flex items-center gap-2">
                      {canManageUser(user) && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUpdateRole(user)}
                            data-testid={`button-edit-role-${user.id}`}
                          >
                            <Settings className="h-3 w-3 mr-1" />
                            Edit Role
                          </Button>
                          
                          {userStats.assignedLeads > 0 && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOwnershipTransfer(user)}
                              data-testid={`button-transfer-leads-${user.id}`}
                            >
                              <RefreshCw className="h-3 w-3 mr-1" />
                              Transfer Leads
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setUserToSuspend(user);
                              setShowSuspendDialog(true);
                            }}
                            className={user.isSuspended ? "text-green-600 hover:text-green-700 hover:border-green-300" : "text-yellow-600 hover:text-yellow-700 hover:border-yellow-300"}
                            data-testid={`button-suspend-user-${user.id}`}
                          >
                            {user.isSuspended ? (
                              <>
                                <RefreshCw className="h-3 w-3 mr-1" />
                                Reactivate
                              </>
                            ) : (
                              <>
                                <XSquare className="h-3 w-3 mr-1" />
                                Suspend
                              </>
                            )}
                          </Button>

                          {user.id !== currentUser.id && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteUser(user)}
                              className="text-red-600 hover:text-red-700 hover:border-red-300"
                              data-testid={`button-delete-user-${user.id}`}
                            >
                              <Trash2 className="h-3 w-3 mr-1" />
                              Delete
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Role Update Dialog */}
      <Dialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
        <DialogContent data-testid="dialog-role-update">
          <DialogHeader>
            <DialogTitle>Update User Role</DialogTitle>
            <DialogDescription>
              Change the role for {selectedUser?.firstName} {selectedUser?.lastName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Current Role</Label>
              <Badge className={getRoleBadgeColor(selectedUser?.role)}>
                {selectedUser?.role}
              </Badge>
            </div>
            <div className="space-y-2">
              <Label>New Role</Label>
              <Select onValueChange={handleConfirmRoleUpdate}>
                <SelectTrigger data-testid="select-new-role">
                  <SelectValue placeholder="Select new role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="analyst">Analyst</SelectItem>
                  <SelectItem value="partner">Partner</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowRoleDialog(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>


      {/* Create User Dialog */}
      <Dialog open={showCreateUserDialog} onOpenChange={setShowCreateUserDialog}>
        <DialogContent data-testid="dialog-create-user">
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
            <DialogDescription>
              Add a new team member to the CRM system
            </DialogDescription>
          </DialogHeader>
          <Form {...createUserForm}>
            <form onSubmit={createUserForm.handleSubmit(handleCreateUser)} className="space-y-4">
              <FormField
                control={createUserForm.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John" {...field} data-testid="input-first-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createUserForm.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Doe" {...field} data-testid="input-last-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createUserForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="john.doe@company.com" type="email" {...field} data-testid="input-email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createUserForm.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-user-role">
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="analyst">Analyst</SelectItem>
                        <SelectItem value="partner">Partner</SelectItem>
                        <SelectItem value="intern">Intern</SelectItem>
                        {isAdmin && <SelectItem value="admin">Admin</SelectItem>}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {createUserForm.watch('role') === 'intern' && (
                <FormField
                  control={createUserForm.control}
                  name="analystId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assign to Analyst</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-analyst-assignment">
                            <SelectValue placeholder="Select an analyst" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {users?.filter(u => u.role === 'analyst').map(analyst => (
                            <SelectItem key={analyst.id} value={analyst.id}>
                              {analyst.firstName} {analyst.lastName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <div className="flex justify-end gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setShowCreateUserDialog(false);
                    createUserForm.reset();
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createUserMutation.isPending}
                  data-testid="button-confirm-create-user"
                >
                  {createUserMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Create User
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent data-testid="dialog-delete-user">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {userToDelete?.firstName} {userToDelete?.lastName}?
              This action cannot be undone.
              {getUserStats(userToDelete?.id || "").assignedLeads > 0 && (
                <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <strong>Warning:</strong> This user has {getUserStats(userToDelete?.id || "").assignedLeads} assigned leads. 
                  Consider transferring their leads first.
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteUser}
              className="bg-red-600 hover:bg-red-700"
              data-testid="button-confirm-delete-user"
            >
              {deleteUserMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete User
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* Suspend User Confirmation Dialog */}
      <AlertDialog open={showSuspendDialog} onOpenChange={setShowSuspendDialog}>
        <AlertDialogContent data-testid="dialog-suspend-user">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {userToSuspend?.isSuspended ? "Reactivate User" : "Suspend User"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {userToSuspend?.isSuspended ? (
                <>Reactivate <strong>{userToSuspend?.firstName} {userToSuspend?.lastName}</strong> and restore access to the system?</>
              ) : (
                <>Suspend <strong>{userToSuspend?.firstName} {userToSuspend?.lastName}</strong>? Suspended users cannot log in until reactivated.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                suspendUserMutation.mutate({
                  userId: userToSuspend!.id,
                  suspend: !userToSuspend?.isSuspended,
                })
              }
              className={
                userToSuspend?.isSuspended
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-yellow-600 hover:bg-yellow-700"
              }
              data-testid="button-confirm-suspend-user"
            >
              {suspendUserMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Updating...
                </>
              ) : userToSuspend?.isSuspended ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Reactivate
                </>
              ) : (
                <>
                  <XSquare className="h-4 w-4 mr-1" />
                  Suspend
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Ownership Transfer Dialog */}
      <Dialog open={showOwnershipTransferDialog} onOpenChange={setShowOwnershipTransferDialog}>
        <DialogContent data-testid="dialog-ownership-transfer">
          <DialogHeader>
            <DialogTitle>Transfer Lead Ownership</DialogTitle>
            <DialogDescription>
              Transfer all leads from {userToTransfer?.firstName} {userToTransfer?.lastName} to another user
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
              <div className="text-sm">
                <strong>User:</strong> {userToTransfer?.firstName} {userToTransfer?.lastName}
              </div>
              <div className="text-sm">
                <strong>Leads to transfer:</strong> {getUserStats(userToTransfer?.id || "").assignedLeads}
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Transfer To</Label>
              <Select value={transferToUser} onValueChange={setTransferToUser}>
                <SelectTrigger data-testid="select-transfer-to">
                  <SelectValue placeholder="Select user to receive leads" />
                </SelectTrigger>
                <SelectContent>
                  {users?.filter(u => u.id !== userToTransfer?.id).map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.firstName} {user.lastName} ({user.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowOwnershipTransferDialog(false);
                  setUserToTransfer(null);
                  setTransferToUser("");
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={confirmOwnershipTransfer}
                disabled={!transferToUser || ownershipTransferMutation.isPending}
                data-testid="button-confirm-transfer-ownership"
              >
                {ownershipTransferMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Transferring...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Transfer Leads
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
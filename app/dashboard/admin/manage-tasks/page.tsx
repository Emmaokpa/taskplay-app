// c:/Users/Emmanuel Okpa/Desktop/TaskPlay/client/app/dashboard/admin/manage-tasks/page.tsx
"use client";
import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/firebase/config";
import { collection, query, getDocs, orderBy, doc, deleteDoc, updateDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useRouter } from "next/navigation";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface Task {
  id: string;
  title: string;
  description: string;
  reward: number;
  type: "watch_ad" | "cpa_offer" | "mini_game";
  offerUrl?: string;
  imageUrl?: string;
  active: boolean;
  videoUrl?: string;
}

export default function ManageTasksPage() {
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [taskToDeleteId, setTaskToDeleteId] = useState<string | null>(null);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);

  // Admin access control
  useEffect(() => {
    if (!authLoading && !isAdmin) {
      toast.error("Access Denied", {
        description: "You do not have permission to access this page.",
      });
      router.push("/dashboard");
    }
  }, [user, authLoading, isAdmin, router]);

  useEffect(() => {
    if (!isAdmin) return; // Don't fetch if not admin

    const fetchTasks = async () => {
      try {
        const tasksCollectionRef = collection(db, "tasks");
        // Admin sees all tasks, not just active ones, ordered by most recent
        const q = query(tasksCollectionRef, orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        const fetchedTasks: Task[] = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Task[];
        setTasks(fetchedTasks);
      } catch (error: any) {
        console.error("Error fetching tasks:", error);
        toast.error("Failed to load tasks.", {
          description: error.message,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, [isAdmin]);

  const handleToggleActive = async (taskId: string, currentStatus: boolean) => {
    // Optimistically update the UI
    setTasks(tasks.map(task => 
      task.id === taskId ? { ...task, active: !currentStatus } : task
    ));

    try {
      const taskDocRef = doc(db, "tasks", taskId);
      await updateDoc(taskDocRef, {
        active: !currentStatus,
      });
      toast.success(`Task status updated successfully.`);
    } catch (error: any) {
      // Revert the UI change on error
      setTasks(tasks.map(task => 
        task.id === taskId ? { ...task, active: currentStatus } : task
      ));
      toast.error("Failed to update task status.", { description: error.message });
    }
  };

  const handleDeleteTask = (taskId: string) => {
    setTaskToDeleteId(taskId);
  };

  const confirmDeleteTask = async () => {
    if (!taskToDeleteId) return;

    setDeletingTaskId(taskToDeleteId);
    try {
      await deleteDoc(doc(db, "tasks", taskToDeleteId));
      setTasks(tasks.filter((task) => task.id !== taskToDeleteId));
      toast.success("Task deleted successfully!");
    } catch (error: any) {
      console.error("Error deleting task:", error);
      toast.error("Failed to delete task.", {
        description: error.message,
      });
    } finally {
      setDeletingTaskId(null);
      setTaskToDeleteId(null);
    }
  };

  if (authLoading || !isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p>Loading or checking permissions...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full p-4">
      <div className="w-full max-w-5xl flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold">Manage Tasks</h1>
        <Link href="/dashboard/admin/create-task" passHref>
          <Button>Create New Task</Button>
        </Link>
      </div>

      {loading ? (
        <p>Loading tasks...</p>
      ) : tasks.length === 0 ? (
        <p className="text-lg text-gray-500">No tasks found. Create one to get started!</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-5xl">
          {tasks.map((task) => (
            <Card key={task.id} className="flex flex-col justify-between">
              <CardHeader>
                <CardTitle>{task.title}</CardTitle>
                {!task.active && (
                  <span className="text-xs font-bold text-yellow-500 bg-yellow-100 px-2 py-1 rounded-full w-fit">
                    INACTIVE
                  </span>
                )}
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">{task.description}</p>
                {task.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={task.imageUrl} alt={task.title} className="w-full h-32 object-cover mb-4 rounded" />
                )}
                <p className="text-lg font-semibold text-green-500">
                  Reward: ₦{task.reward}
                </p>

                <div className="flex items-center space-x-2 mt-4">
                  <Switch
                    id={`active-switch-${task.id}`}
                    checked={task.active}
                    onCheckedChange={() => handleToggleActive(task.id, task.active)}
                  />
                  <Label htmlFor={`active-switch-${task.id}`}>{task.active ? "Active" : "Inactive"}</Label>
                </div>
                
                {/* Admin Controls */}
                <div className="flex flex-col sm:flex-row gap-2 mt-4">
                  <Link href={`/dashboard/admin/edit-task/${task.id}`} className="w-full">
                    <Button variant="outline" className="w-full">
                      Edit
                    </Button>
                  </Link>
                  <Button
                    onClick={() => handleDeleteTask(task.id)}
                    className="w-full"
                    variant="destructive"
                    disabled={deletingTaskId === task.id}
                  >
                    {deletingTaskId === task.id ? "Deleting..." : "Delete"}
                  </Button>
                </div>

              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!taskToDeleteId} onOpenChange={(open) => !open && setTaskToDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the task
              from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!deletingTaskId}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteTask} disabled={!!deletingTaskId}>
              {deletingTaskId ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
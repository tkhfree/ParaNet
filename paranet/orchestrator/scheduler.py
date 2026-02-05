"""
Deployment Scheduler Module

Schedules and orders configuration deployment.
"""

from dataclasses import dataclass, field
from typing import Any


@dataclass
class DeploymentTask:
    """A single deployment task."""
    task_id: str
    config_name: str
    target: str
    dependencies: list[str] = field(default_factory=list)
    priority: int = 0


class DeploymentScheduler:
    """
    Schedules deployment tasks based on dependencies and priorities.
    
    Features:
    - Dependency resolution
    - Priority-based ordering
    - Parallel deployment detection
    """
    
    def __init__(self):
        """Initialize the scheduler."""
        self._tasks: dict[str, DeploymentTask] = {}
    
    def add_task(self, task: DeploymentTask) -> None:
        """
        Add a deployment task.
        
        Args:
            task: Task to add.
        """
        self._tasks[task.task_id] = task
    
    def clear(self) -> None:
        """Clear all tasks."""
        self._tasks.clear()
    
    def schedule(self) -> list[list[DeploymentTask]]:
        """
        Generate an execution schedule.
        
        Returns:
            List of task batches. Tasks in the same batch can run in parallel.
        """
        if not self._tasks:
            return []
        
        # Topological sort with parallel grouping
        scheduled: list[list[DeploymentTask]] = []
        remaining = set(self._tasks.keys())
        completed: set[str] = set()
        
        while remaining:
            # Find tasks with all dependencies satisfied
            ready = [
                self._tasks[tid] for tid in remaining
                if all(dep in completed for dep in self._tasks[tid].dependencies)
            ]
            
            if not ready:
                # Circular dependency detected
                raise ValueError(
                    f"Circular dependency detected among: {remaining}"
                )
            
            # Sort by priority within the batch
            ready.sort(key=lambda t: -t.priority)
            scheduled.append(ready)
            
            for task in ready:
                remaining.remove(task.task_id)
                completed.add(task.task_id)
        
        return scheduled
    
    def get_execution_order(self) -> list[DeploymentTask]:
        """
        Get a flattened execution order.
        
        Returns:
            Ordered list of tasks.
        """
        batches = self.schedule()
        return [task for batch in batches for task in batch]

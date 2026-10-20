from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from app.db.mongodb import get_database
from app.core.dependencies import require_admin
from app.schemas.resource import ResourceAllocationResponse, ResourceApprovalRequest
from app.services.resource_service import ResourceService

router = APIRouter(prefix="/resources", tags=["Resource Planning"])

@router.get("", response_model=List[ResourceAllocationResponse])
async def get_resource_allocations(
    current_admin: dict = Depends(require_admin),
    db = Depends(get_database)
):
    """Retrieve recommended and approved municipal crew allocations."""
    service = ResourceService(db)
    return service.get_allocations()

@router.post("/recommend", response_model=List[ResourceAllocationResponse])
@router.post("/plan", response_model=List[ResourceAllocationResponse])
async def generate_recommendations(
    current_admin: dict = Depends(require_admin),
    db = Depends(get_database)
):
    """
    Generate fresh crew allocation recommendations based on predicted demand
    and hard departmental capacity limits.
    """
    service = ResourceService(db)
    return service.generate_recommendations()

@router.patch("/{alloc_id}", response_model=ResourceAllocationResponse)
@router.patch("/{alloc_id}/approve", response_model=ResourceAllocationResponse)
async def approve_allocation(
    alloc_id: str,
    payload: ResourceApprovalRequest,
    current_admin: dict = Depends(require_admin),
    db = Depends(get_database)
):
    """Update status of a crew allocation recommendation (Approved, Rejected, Deployed)."""
    service = ResourceService(db)
    updated = service.approve_or_update(
        alloc_id=alloc_id,
        status=payload.allocation_status,
        approved_crews=payload.approved_crews,
        notes=payload.notes
    )
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Resource allocation record '{alloc_id}' not found."
        )
    return updated

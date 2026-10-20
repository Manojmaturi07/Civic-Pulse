from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from app.db.mongodb import get_database
from app.core.dependencies import get_current_user, get_optional_user
from app.schemas.issue import IssueCreate, IssueUpdate, IssueResponse
from app.services.issue_service import IssueService

router = APIRouter(prefix="/issues", tags=["Issues Management"])

@router.get("", response_model=List[IssueResponse])
async def list_issues(
    city: Optional[str] = Query(None),
    type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    area: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    current_user: Optional[dict] = Depends(get_optional_user),
    db = Depends(get_database),
):
    """
    List civic issue complaints with optional filtering by municipality, area, status, category,
    or keyword search.
    """
    service = IssueService(db)
    user_id = current_user.get("id") if current_user else None
    return service.list_issues(
        city=city,
        type_=type,
        status_=status,
        area=area,
        search=search,
        skip=skip,
        limit=limit,
        current_user_id=user_id,
    )

@router.get("/my", response_model=List[IssueResponse])
@router.get("/mine", response_model=List[IssueResponse])
async def get_my_issues(
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database),
):
    """Fetch all civic reports created by the currently logged-in citizen."""
    service = IssueService(db)
    return service.get_user_reports(current_user["id"])

@router.get("/{issue_id}", response_model=IssueResponse)
async def get_issue_by_id(
    issue_id: str,
    current_user: Optional[dict] = Depends(get_optional_user),
    db = Depends(get_database),
):
    """Fetch single civic report by internal ID or public issue code (e.g. CP-1042)."""
    service = IssueService(db)
    user_id = current_user.get("id") if current_user else None
    issue = service.get_by_id_or_code(issue_id, current_user_id=user_id)
    if not issue:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Civic report '{issue_id}' not found."
        )
    return issue

@router.post("", response_model=IssueResponse, status_code=status.HTTP_201_CREATED)
async def create_issue(
    payload: IssueCreate,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database),
):
    """Submit a new verified citizen complaint with automated priority scoring."""
    service = IssueService(db)
    return service.create_issue(payload, current_user)

@router.put("/{issue_id}", response_model=IssueResponse)
@router.patch("/{issue_id}", response_model=IssueResponse)
async def update_issue(
    issue_id: str,
    payload: IssueUpdate,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database),
):
    """
    Update ticket details or status under role-based authorization:
    - Admins can assign status, department, and priority scores.
    - Citizens can modify description of their own pending reports.
    """
    service = IssueService(db)
    try:
        updated = service.update_issue(issue_id, payload, current_user)
        if not updated:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Civic report '{issue_id}' not found."
            )
        return updated
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))

@router.delete("/{issue_id}", status_code=status.HTTP_200_OK)
async def delete_issue(
    issue_id: str,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database),
):
    """Delete an issue ticket: Allowed for municipal admin or original author if pending."""
    service = IssueService(db)
    try:
        deleted = service.delete_issue(issue_id, current_user)
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Civic report '{issue_id}' not found."
            )
        return {"success": True, "message": f"Issue '{issue_id}' deleted successfully."}
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))

# ADO Service Documentation

## Overview

The ADO Service provides comprehensive functionality to fetch Azure DevOps (ADO) work items following the organizational hierarchy:

**Feature → Platform Feature → User Story**

## Features

- ✅ Fetch all Features with their complete hierarchy
- ✅ Search work items by title or description
- ✅ Filter work items by area path
- ✅ Get specific work item details
- ✅ Validate ADO connection
- ✅ Comprehensive error handling
- ✅ TypeScript interfaces for type safety

## Prerequisites

Before using the ADO service, ensure:

1. ADO integration is configured in the project metadata
2. Valid Personal Access Token is stored
3. Organization and project names are set up

## Configuration

The service uses the `getAdoTokenInfo()` utility to retrieve stored credentials:

```typescript
interface AdoTokenInfo {
  organization: string | null;
  project: string | null;
  personalAcessToken: string | null;
  adoUrl: string | null;
}
```

## Core Interfaces

### AdoWorkItem
Represents a single work item from Azure DevOps:

```typescript
interface AdoWorkItem {
  id: number;
  url: string;
  rev: number;
  fields: {
    'System.Id': number;
    'System.Title': string;
    'System.WorkItemType': string;
    'System.State': string;
    'System.AssignedTo'?: AdoUser;
    'System.CreatedDate': string;
    'System.ChangedDate': string;
    'System.Description'?: string;
    // ... additional fields
  };
  relations?: AdoWorkItemRelation[];
}
```

### AdoWorkItemHierarchy
Represents the hierarchical structure:

```typescript
interface AdoWorkItemHierarchy {
  feature: AdoWorkItem;                    // Top-level Feature
  platformFeatures: AdoWorkItemHierarchy[]; // Platform Features (children of Feature)
  userStories: AdoWorkItem[];              // User Stories (direct children)
}
```

## Usage Examples

### 1. Fetch All Features with Children

```typescript
import { AdoService } from './ado.service';

constructor(private adoService: AdoService) {}

loadFeatures(projectId: string): void {
  this.adoService.fetchFeaturesWithChildren(projectId).subscribe({
    next: (result) => {
      console.log(`Loaded ${result.totalFeatures} features`);
      
      result.features.forEach(featureHierarchy => {
        const feature = featureHierarchy.feature;
        console.log(`Feature: ${feature.fields['System.Title']}`);
        
        // Process Platform Features
        featureHierarchy.platformFeatures.forEach(pfHierarchy => {
          const platformFeature = pfHierarchy.feature;
          console.log(`  Platform Feature: ${platformFeature.fields['System.Title']}`);
          
          // Process User Stories under Platform Feature
          pfHierarchy.userStories.forEach(userStory => {
            console.log(`    User Story: ${userStory.fields['System.Title']}`);
          });
        });
        
        // Process direct User Stories
        featureHierarchy.userStories.forEach(userStory => {
          console.log(`  Direct User Story: ${userStory.fields['System.Title']}`);
        });
      });
    },
    error: (error) => {
      console.error('Failed to load features:', error);
    }
  });
}
```

### 2. Search Work Items

```typescript
searchWorkItems(searchTerm: string, projectId: string): void {
  this.adoService.searchWorkItems(
    searchTerm, 
    projectId, 
    ['Feature', 'User Story'] // Optional: filter by work item types
  ).subscribe({
    next: (workItems) => {
      workItems.forEach(item => {
        console.log(`${item.fields['System.WorkItemType']}: ${item.fields['System.Title']}`);
      });
    },
    error: (error) => {
      console.error('Search failed:', error);
    }
  });
}
```

### 3. Get Work Items by Area Path

```typescript
getWorkItemsByArea(areaPath: string, projectId: string): void {
  this.adoService.getWorkItemsByAreaPath(areaPath, projectId).subscribe({
    next: (workItems) => {
      console.log(`Found ${workItems.length} work items in area: ${areaPath}`);
    },
    error: (error) => {
      console.error('Failed to get work items by area:', error);
    }
  });
}
```

### 4. Get Specific Work Item

```typescript
getWorkItemDetails(workItemId: number, projectId: string): void {
  this.adoService.getWorkItemById(workItemId, projectId).subscribe({
    next: (workItem) => {
      console.log('Work Item Details:', {
        id: workItem.id,
        title: workItem.fields['System.Title'],
        type: workItem.fields['System.WorkItemType'],
        state: workItem.fields['System.State'],
        assignedTo: workItem.fields['System.AssignedTo']?.displayName
      });
    },
    error: (error) => {
      console.error('Failed to get work item:', error);
    }
  });
}
```

### 5. Validate Connection

```typescript
validateConnection(projectId: string): void {
  this.adoService.validateConnection(projectId).subscribe({
    next: (isValid) => {
      if (isValid) {
        console.log('✅ ADO connection is valid');
      } else {
        console.log('❌ ADO connection is invalid');
      }
    },
    error: (error) => {
      console.error('Connection validation failed:', error);
    }
  });
}
```

## Helper Methods

### Extract User Stories from Hierarchy

```typescript
extractAllUserStories(hierarchy: AdoWorkItemHierarchy[]): AdoWorkItem[] {
  const userStories: AdoWorkItem[] = [];
  
  hierarchy.forEach(featureHierarchy => {
    // Add direct user stories
    userStories.push(...featureHierarchy.userStories);
    
    // Add user stories from platform features
    featureHierarchy.platformFeatures.forEach(pfHierarchy => {
      userStories.push(...pfHierarchy.userStories);
    });
  });
  
  return userStories;
}
```

### Filter Work Items by State

```typescript
getWorkItemsByState(hierarchy: AdoWorkItemHierarchy[], state: string): AdoWorkItem[] {
  const workItems: AdoWorkItem[] = [];
  
  hierarchy.forEach(featureHierarchy => {
    // Check feature
    if (featureHierarchy.feature.fields['System.State'] === state) {
      workItems.push(featureHierarchy.feature);
    }
    
    // Check platform features and their user stories
    featureHierarchy.platformFeatures.forEach(pfHierarchy => {
      if (pfHierarchy.feature.fields['System.State'] === state) {
        workItems.push(pfHierarchy.feature);
      }
      
      pfHierarchy.userStories.forEach(us => {
        if (us.fields['System.State'] === state) {
          workItems.push(us);
        }
      });
    });
    
    // Check direct user stories
    featureHierarchy.userStories.forEach(us => {
      if (us.fields['System.State'] === state) {
        workItems.push(us);
      }
    });
  });
  
  return workItems;
}
```

## Error Handling

The service includes comprehensive error handling:

- **401 Unauthorized**: Invalid Personal Access Token
- **403 Forbidden**: Insufficient permissions
- **404 Not Found**: Project or resource not found
- **Network errors**: Connection issues

All errors are logged and user-friendly messages are displayed via the ToasterService.

## Performance Considerations

- The service uses batch requests to minimize API calls
- WIQL queries are optimized for performance
- Requests are made in parallel where possible using `forkJoin`
- Error boundaries prevent single failures from breaking the entire hierarchy

## Dependencies

- Angular HttpClient for API calls
- RxJS for reactive programming
- ElectronService for credential validation
- ToasterService for error notifications

## API Limitations

- ADO REST API rate limits apply
- Maximum 200 work items per batch request
- WIQL queries have complexity limitations

## Security

- Personal Access Tokens are stored securely in session storage
- Tokens are base64 encoded for Basic authentication
- No credentials are logged or exposed in error messages

## Troubleshooting

### Common Issues

1. **"ADO credentials not found"**
   - Ensure ADO integration is configured in project metadata
   - Check that Personal Access Token is valid

2. **"Authentication failed"**
   - Verify Personal Access Token has correct permissions
   - Check token expiration date

3. **"Project not found"**
   - Verify organization and project names are correct
   - Ensure user has access to the project

4. **"No work items found"**
   - Check if Features exist in the project
   - Verify work item states (excluded 'Removed' items)

### Debug Mode

Enable console logging to see detailed information about queries and responses:

```typescript
// The service automatically logs errors and important operations
// Check browser console for detailed information
```

## Future Enhancements

- [ ] Caching mechanism for frequently accessed work items
- [ ] Real-time updates via SignalR
- [ ] Bulk operations support
- [ ] Custom field mapping
- [ ] Work item creation and updates
- [ ] Attachment handling

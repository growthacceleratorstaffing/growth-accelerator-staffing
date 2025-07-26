import { supabase } from "@/integrations/supabase/client";

type JazzHRRole = "super_admin" | "recruiting_admin" | "recruiting_user" | "interviewer" | "super_user" | "developer" | "external_recruiter";

// Sample Workable users for testing
const testWorkableUsers = [
  {
    workable_user_id: "wkbl_001",
    workable_email: "bart@startupaccelerator.nl",
    workable_role: "admin" as const,
    permissions: {
      can_manage_users: true,
      can_view_all_jobs: true,
      can_edit_jobs: true,
      can_view_reports: true
    },
    assigned_jobs: ["*"], // * means all jobs
  },
  {
    workable_user_id: "wkbl_002", 
    workable_email: "recruiter@startupaccelerator.nl",
    workable_role: "hiring_manager" as const,
    permissions: {
      can_manage_candidates: true,
      can_view_jobs: true,
      can_edit_jobs: true
    },
    assigned_jobs: ["job_001", "job_002"],
  },
  {
    workable_user_id: "wkbl_003",
    workable_email: "hiring@startupaccelerator.nl", 
    workable_role: "simple" as const,
    permissions: {
      can_view_candidates: true,
      can_add_notes: true
    },
    assigned_jobs: ["job_001"],
  },
  {
    workable_user_id: "wkbl_004",
    workable_email: "interviewer@startupaccelerator.nl",
    workable_role: "interviewer" as const,
    permissions: {
      can_view_assigned_candidates: true,
      can_complete_interviews: true
    },
    assigned_jobs: ["job_001"],
  }
];

export async function addTestWorkableUsers() {
  try {
    console.log('Adding test Workable users...');
    
    for (const user of testWorkableUsers) {
      const { data, error } = await supabase
        .from('workable_users')
        .upsert(user, { 
          onConflict: 'workable_user_id'
        });
      
      if (error) {
        console.error(`Failed to add user ${user.workable_email}:`, error);
      } else {
        console.log(`Successfully added user: ${user.workable_email} (${user.workable_role})`);
      }
    }
    
    console.log('✅ Test Workable users have been added successfully!');
    console.log('You can now register with these emails:');
    testWorkableUsers.forEach(user => {
      console.log(`- ${user.workable_email} (${user.workable_role})`);
    });
    
    return { success: true, usersAdded: testWorkableUsers.length };
  } catch (error) {
    console.error('Error adding test users:', error);
    return { success: false, error: error.message };
  }
}

// For browser console usage
(window as any).addTestWorkableUsers = addTestWorkableUsers;
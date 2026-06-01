package mcp

import (
	"context"
	"fmt"
	"strings"

	"docker-manager/internal/docker"
	"docker-manager/internal/models"

	mcpsdk "github.com/modelcontextprotocol/go-sdk/mcp"
)

// registerTools は docker-manager の MCP tool を server に登録する。
func registerTools(server *mcpsdk.Server, dc *docker.Client) {
	registerListApps(server, dc)
	registerInspectApp(server, dc)
	registerGetLogs(server, dc)
	registerGetHostInfo(server, dc)
	registerLifecycleOps(server, dc)
	registerPullImages(server, dc)
	registerCheckImageUpdates(server, dc)
}

// ------------------------------------------------------------
// list_apps
// ------------------------------------------------------------

// ListAppsInput は list_apps tool の入力。
type ListAppsInput struct {
	StatusFilter string `json:"status_filter,omitempty" jsonschema:"filter by app status; one of running, stopped, error"`
	NameFilter   string `json:"name_filter,omitempty" jsonschema:"case-insensitive substring match on project name"`
}

// ListAppsOutput は list_apps tool の出力。
type ListAppsOutput struct {
	Apps    []models.ComposeApp `json:"apps"`
	Summary string              `json:"summary"`
}

func registerListApps(server *mcpsdk.Server, dc *docker.Client) {
	mcpsdk.AddTool(server, &mcpsdk.Tool{
		Name:        "list_apps",
		Description: "List Docker Compose projects detected on the host, optionally filtered by status or name substring.",
	}, func(_ context.Context, _ *mcpsdk.CallToolRequest, in ListAppsInput) (*mcpsdk.CallToolResult, ListAppsOutput, error) {
		apps, err := dc.ListComposeApps()
		if err != nil {
			return nil, ListAppsOutput{}, err
		}

		filtered := apps[:0]
		needle := strings.ToLower(in.NameFilter)
		for _, app := range apps {
			if in.StatusFilter != "" && app.Status != in.StatusFilter {
				continue
			}
			if needle != "" && !strings.Contains(strings.ToLower(app.Name), needle) {
				continue
			}
			filtered = append(filtered, app)
		}

		return nil, ListAppsOutput{
			Apps:    filtered,
			Summary: summarizeApps(filtered),
		}, nil
	})
}

func summarizeApps(apps []models.ComposeApp) string {
	running, stopped, errored := 0, 0, 0
	for _, a := range apps {
		switch a.Status {
		case "running":
			running++
		case "error":
			errored++
		default:
			stopped++
		}
	}
	return fmt.Sprintf("%d projects: %d running, %d stopped, %d errored", len(apps), running, stopped, errored)
}

// ------------------------------------------------------------
// inspect_app
// ------------------------------------------------------------

// InspectAppInput は inspect_app tool の入力。
type InspectAppInput struct {
	Name string `json:"name" jsonschema:"Compose project name to inspect"`
}

func registerInspectApp(server *mcpsdk.Server, dc *docker.Client) {
	mcpsdk.AddTool(server, &mcpsdk.Tool{
		Name:        "inspect_app",
		Description: "Inspect a Compose project, returning per-service details (image digest, env, ports, networks, mounts, restart count).",
	}, func(_ context.Context, _ *mcpsdk.CallToolRequest, in InspectAppInput) (*mcpsdk.CallToolResult, models.InspectedApp, error) {
		if in.Name == "" {
			return nil, models.InspectedApp{}, fmt.Errorf("name is required")
		}
		app, err := dc.InspectApp(in.Name)
		if err != nil {
			return nil, models.InspectedApp{}, err
		}
		return nil, *app, nil
	})
}

// ------------------------------------------------------------
// get_logs
// ------------------------------------------------------------

// GetLogsInput は get_logs tool の入力。
type GetLogsInput struct {
	App     string `json:"app" jsonschema:"Compose project name"`
	Service string `json:"service,omitempty" jsonschema:"optional service name; omit for all services in the project"`
	Tail    int    `json:"tail,omitempty" jsonschema:"number of trailing lines per service (default 200, max 2000)"`
	Since   string `json:"since,omitempty" jsonschema:"only return logs since this time (e.g. '10m' or an RFC3339 timestamp)"`
}

// GetLogsOutput は get_logs tool の出力。
type GetLogsOutput struct {
	Lines []models.LogLine `json:"lines"`
	Count int              `json:"count"`
}

func registerGetLogs(server *mcpsdk.Server, dc *docker.Client) {
	mcpsdk.AddTool(server, &mcpsdk.Tool{
		Name:        "get_logs",
		Description: "Fetch recent logs from one or all services of a Compose project. Streams are demultiplexed into stdout/stderr.",
	}, func(_ context.Context, _ *mcpsdk.CallToolRequest, in GetLogsInput) (*mcpsdk.CallToolResult, GetLogsOutput, error) {
		if in.App == "" {
			return nil, GetLogsOutput{}, fmt.Errorf("app is required")
		}
		lines, err := dc.GetLogs(in.App, docker.LogsOptions{
			Service: in.Service,
			Tail:    in.Tail,
			Since:   in.Since,
		})
		if err != nil {
			return nil, GetLogsOutput{}, err
		}
		return nil, GetLogsOutput{Lines: lines, Count: len(lines)}, nil
	})
}

// ------------------------------------------------------------
// get_host_info
// ------------------------------------------------------------

// GetHostInfoInput は get_host_info tool の入力（引数なし）。
type GetHostInfoInput struct{}

func registerGetHostInfo(server *mcpsdk.Server, dc *docker.Client) {
	mcpsdk.AddTool(server, &mcpsdk.Tool{
		Name:        "get_host_info",
		Description: "Return Docker daemon and host summary: version, OS/kernel, CPU/memory, container/image counts.",
	}, func(_ context.Context, _ *mcpsdk.CallToolRequest, _ GetHostInfoInput) (*mcpsdk.CallToolResult, models.HostInfo, error) {
		hi, err := dc.GetHostInfo()
		if err != nil {
			return nil, models.HostInfo{}, err
		}
		return nil, *hi, nil
	})
}

// ------------------------------------------------------------
// start_app / stop_app / restart_app
// ------------------------------------------------------------

// LifecycleInput は start_app / stop_app / restart_app の共通入力。
type LifecycleInput struct {
	App     string `json:"app" jsonschema:"Compose project name"`
	Service string `json:"service,omitempty" jsonschema:"optional service name; omit to target all services"`
}

// LifecycleOutput は lifecycle 系 tool の共通出力。
type LifecycleOutput struct {
	App     string `json:"app"`
	Service string `json:"service,omitempty"`
	Action  string `json:"action"`
	Message string `json:"message"`
}

func registerLifecycleOps(server *mcpsdk.Server, dc *docker.Client) {
	type op struct {
		name        string
		description string
		invoke      func(app, service string) error
	}

	ops := []op{
		{
			name:        "start_app",
			description: "Start containers of a Compose project (or one service).",
			invoke:      dc.StartComposeApp,
		},
		{
			name:        "stop_app",
			description: "Stop containers of a Compose project (or one service).",
			invoke:      dc.StopComposeApp,
		},
		{
			name:        "restart_app",
			description: "Restart containers of a Compose project (or one service).",
			invoke:      dc.RestartComposeApp,
		},
	}

	for _, o := range ops {
		o := o
		mcpsdk.AddTool(server, &mcpsdk.Tool{
			Name:        o.name,
			Description: o.description,
		}, func(_ context.Context, _ *mcpsdk.CallToolRequest, in LifecycleInput) (*mcpsdk.CallToolResult, LifecycleOutput, error) {
			if in.App == "" {
				return nil, LifecycleOutput{}, fmt.Errorf("app is required")
			}
			if err := o.invoke(in.App, in.Service); err != nil {
				return nil, LifecycleOutput{}, err
			}
			return nil, LifecycleOutput{
				App:     in.App,
				Service: in.Service,
				Action:  strings.TrimSuffix(o.name, "_app"),
				Message: fmt.Sprintf("%s succeeded", o.name),
			}, nil
		})
	}
}

// ------------------------------------------------------------
// pull_images
// ------------------------------------------------------------

// PullImagesInput は pull_images tool の入力。
type PullImagesInput struct {
	App string `json:"app" jsonschema:"Compose project name"`
}

// PullImagesOutput は pull_images tool の出力。
type PullImagesOutput struct {
	App     string `json:"app"`
	Message string `json:"message"`
}

func registerPullImages(server *mcpsdk.Server, dc *docker.Client) {
	mcpsdk.AddTool(server, &mcpsdk.Tool{
		Name:        "pull_images",
		Description: "Pull the latest images for all services in a Compose project. Does not recreate containers.",
	}, func(_ context.Context, _ *mcpsdk.CallToolRequest, in PullImagesInput) (*mcpsdk.CallToolResult, PullImagesOutput, error) {
		if in.App == "" {
			return nil, PullImagesOutput{}, fmt.Errorf("app is required")
		}
		if err := dc.PullImages(in.App); err != nil {
			return nil, PullImagesOutput{}, err
		}
		return nil, PullImagesOutput{App: in.App, Message: "images pulled"}, nil
	})
}

// ------------------------------------------------------------
// check_image_updates
// ------------------------------------------------------------

// CheckImageUpdatesInput は check_image_updates tool の入力。
type CheckImageUpdatesInput struct {
	App string `json:"app" jsonschema:"Compose project name"`
}

// CheckImageUpdatesOutput は check_image_updates tool の出力。
type CheckImageUpdatesOutput struct {
	App          string               `json:"app"`
	Updates      []models.ImageUpdate `json:"updates"`
	UpdateCount  int                  `json:"updateCount"`
	CheckedCount int                  `json:"checkedCount"`
}

func registerCheckImageUpdates(server *mcpsdk.Server, dc *docker.Client) {
	mcpsdk.AddTool(server, &mcpsdk.Tool{
		Name:        "check_image_updates",
		Description: "Compare each service's local image manifest digest against the registry to detect available updates.",
	}, func(_ context.Context, _ *mcpsdk.CallToolRequest, in CheckImageUpdatesInput) (*mcpsdk.CallToolResult, CheckImageUpdatesOutput, error) {
		if in.App == "" {
			return nil, CheckImageUpdatesOutput{}, fmt.Errorf("app is required")
		}
		updates, err := dc.CheckImageUpdates(in.App)
		if err != nil {
			return nil, CheckImageUpdatesOutput{}, err
		}
		updateCount := 0
		for _, u := range updates {
			if u.UpdateRequired {
				updateCount++
			}
		}
		return nil, CheckImageUpdatesOutput{
			App:          in.App,
			Updates:      updates,
			UpdateCount:  updateCount,
			CheckedCount: len(updates),
		}, nil
	})
}

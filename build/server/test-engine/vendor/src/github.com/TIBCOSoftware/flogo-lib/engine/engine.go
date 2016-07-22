package engine

import (
	"encoding/json"
	"fmt"

	"github.com/TIBCOSoftware/flogo-lib/core/data"
	"github.com/TIBCOSoftware/flogo-lib/core/ext/trigger"
	"github.com/TIBCOSoftware/flogo-lib/core/flowinst"
	"github.com/TIBCOSoftware/flogo-lib/engine/runner"
	"github.com/TIBCOSoftware/flogo-lib/util"
	"github.com/op/go-logging"
)

var log = logging.MustGetLogger("engine")

// Engine creates and executes FlowInstances.
type Engine struct {
	generator   *util.Generator
	runner      runner.Runner
	env         *Environment
	instManager *flowinst.Manager
}

// NewEngine create a new Engine
func NewEngine(env *Environment) *Engine {

	var engine Engine
	engine.generator, _ = util.NewGenerator()
	engine.env = env

	// initialize engine environment
	engine.env.Init()

	stateRecorder, enabled := env.StateRecorderService()

	if !enabled {
		stateRecorder = nil
	}

	runnerConfig := engine.env.engineConfig.RunnerConfig

	if runnerConfig.Type == "direct" {
		engine.runner = runner.NewDirectRunner(stateRecorder, runnerConfig.Direct.MaxStepCount)
	} else {
		engine.runner = runner.NewPooledRunner(runnerConfig.Pooled, stateRecorder)
	}

	if log.IsEnabledFor(logging.DEBUG) {
		cfgJSON, _ := json.MarshalIndent(env.engineConfig, "", "  ")
		log.Debugf("Engine Configuration:\n%s\n", string(cfgJSON))
	}

	if log.IsEnabledFor(logging.DEBUG) {
		cfgJSON, _ := json.MarshalIndent(env.triggersConfig, "", "  ")
		log.Debugf("Triggers Configuration:\n%s\n", string(cfgJSON))
	}

	engine.instManager = flowinst.NewManager(env.FlowProviderService(), &engine)

	return &engine
}

// Start will start the engine, by starting all of its triggers and runner
func (e *Engine) Start() {

	log.Info("Engine: Starting...")

	engineTester, testerEnable := e.env.EngineTesterService()

	triggers := trigger.Triggers()
	triggersConfig := e.env.TriggersConfig()

	var triggersToStart []trigger.Trigger

	// initialize triggers
	for _, trigger := range triggers {

		triggerConfig, found := triggersConfig.Triggers[trigger.Metadata().ID]

		if !found && !testerEnable {
			panic(fmt.Errorf("Trigger configuration for '%s' not provided", trigger.Metadata().ID))
		}

		if found {
			trigger.Init(e, triggerConfig)
			triggersToStart = append(triggersToStart, trigger)
		}
	}

	// start the flow provider service
	flowProvider := e.env.FlowProviderService()
	startManaged("FlowProvider Service", flowProvider)

	// start the state recorder service if enabled
	stateRecorder, enabled := e.env.StateRecorderService()
	if enabled {
		startManaged("StateRecorder Service", stateRecorder)
	}

	startManaged("FlowRunner Service", e.runner)

	// start triggers
	for _, trigger := range triggersToStart {
		startManaged("Trigger [ "+trigger.Metadata().ID+" ]", trigger)
	}

	// start the engineTester service if enabled
	//engineTester, enabled := e.env.EngineTesterService()
	if testerEnable {
		engineTester.SetupInstanceSupport(e.instManager, e.runner)
		startManaged("EngineTester Service", engineTester)
	}

	log.Info("Engine: Started")
}

// Stop will stop the engine, by stopping all of its triggers and runner
func (e *Engine) Stop() {

	log.Info("Engine: Stopping...")

	triggers := trigger.Triggers()

	// stop triggers
	for _, trigger := range triggers {
		stopManaged("Trigger [ "+trigger.Metadata().ID+" ]", trigger)
	}

	engineTester, enabled := e.env.EngineTesterService()

	if enabled {
		stopManaged("EngineTester Service", engineTester)
	}

	stopManaged("Flow Runner", e.runner)

	stopManaged("FlowProvider Service", e.env.FlowProviderService())

	stateRecorder, enabled := e.env.StateRecorderService()

	if enabled {
		stopManaged("StateRecorder Service", stateRecorder)
	}

	log.Info("Engine: Stopped")
}

// NewFlowInstanceID implements flowinst.IdGenerator.NewFlowInstanceID
func (e *Engine) NewFlowInstanceID() string {
	return e.generator.NextAsString()
}

// StartFlowInstance implements flowinst.Starter.StartFlowInstance
func (e *Engine) StartFlowInstance(flowURI string, startAttrs []*data.Attribute, replyHandler flowinst.ReplyHandler, execOptions *flowinst.ExecOptions) (instanceID string, startError error) {

	//todo fix for synchronous execution (DirectRunner)

	instance, startError := e.instManager.StartInstance(flowURI, startAttrs, replyHandler, execOptions)

	if startError != nil {
		return "", startError
	}

	e.runner.RunInstance(instance)
	return instance.ID(), nil
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

func startManaged(name string, managed util.Managed) {

	log.Debugf("%s: Starting...", name)
	err := managed.Start()

	if err != nil {
		log.Errorf("%s: Error Starting", name)
		panic(err)
	}

	log.Debugf("%s: Started", name)
}

func stopManaged(name string, managed util.Managed) {

	log.Debugf("%s: Stopping...", name)

	err := util.StopManaged(managed)

	if err != nil {
		log.Errorf("Error stopping '%s': %s", name, err.Error())
	} else {
		log.Debugf("%s: Stopped", name)
	}
}
